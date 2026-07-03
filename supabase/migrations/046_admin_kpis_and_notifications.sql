-- Sprint 10 — Pilotage & productivité : KPIs opérationnels et centre de
-- notifications internes pour le panel admin.

-- ─── KPIs opérationnels ──────────────────────────────────────────────────
-- Agrégats calculés à la volée plutôt que via une vue matérialisée : au
-- volume actuel (quelques dizaines de courses), une requête live reste
-- instantanée et toujours à jour, sans tâche de rafraîchissement à
-- maintenir. À revisiter si le volume de courses grossit significativement.
CREATE OR REPLACE FUNCTION public.get_admin_operational_kpis(p_days integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'invalid_days';
  END IF;

  WITH current_period AS (
    SELECT *
    FROM public.bookings
    WHERE created_at >= now() - (p_days || ' days')::interval
      AND status <> 'draft'
  ),
  previous_period AS (
    SELECT *
    FROM public.bookings
    WHERE created_at >= now() - (p_days * 2 || ' days')::interval
      AND created_at < now() - (p_days || ' days')::interval
      AND status <> 'draft'
  ),
  current_stats AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      count(*) FILTER (WHERE pickup_datetime < now() AND status <> 'cancelled' AND driver_id IS NULL) AS unassigned,
      count(*) FILTER (WHERE pickup_datetime < now() AND status <> 'cancelled') AS resolved,
      avg(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60) FILTER (WHERE accepted_at IS NOT NULL) AS avg_assignment_minutes
    FROM current_period
  ),
  previous_stats AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      count(*) FILTER (WHERE pickup_datetime < now() AND status <> 'cancelled' AND driver_id IS NULL) AS unassigned,
      count(*) FILTER (WHERE pickup_datetime < now() AND status <> 'cancelled') AS resolved,
      avg(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 60) FILTER (WHERE accepted_at IS NOT NULL) AS avg_assignment_minutes
    FROM previous_period
  ),
  current_ratings AS (
    SELECT avg(br.rating)::numeric AS avg_rating, count(*) AS rating_count
    FROM public.booking_ratings br
    WHERE br.rater_role = 'patient'
      AND br.created_at >= now() - (p_days || ' days')::interval
  ),
  geography AS (
    SELECT pickup_municipality, count(*) AS n
    FROM current_period
    WHERE pickup_municipality IS NOT NULL
    GROUP BY pickup_municipality
    ORDER BY n DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'days', p_days,
    'current', jsonb_build_object(
      'total_bookings', cs.total,
      'cancelled_count', cs.cancelled,
      'cancellation_rate', CASE WHEN cs.total > 0 THEN round(cs.cancelled::numeric / cs.total * 100, 1) ELSE NULL END,
      'unassigned_count', cs.unassigned,
      'unassigned_rate', CASE WHEN cs.resolved > 0 THEN round(cs.unassigned::numeric / cs.resolved * 100, 1) ELSE NULL END,
      'avg_assignment_minutes', round(cs.avg_assignment_minutes::numeric, 1),
      'avg_rating', round(cr.avg_rating, 2),
      'rating_count', cr.rating_count
    ),
    'previous', jsonb_build_object(
      'total_bookings', ps.total,
      'cancellation_rate', CASE WHEN ps.total > 0 THEN round(ps.cancelled::numeric / ps.total * 100, 1) ELSE NULL END,
      'unassigned_rate', CASE WHEN ps.resolved > 0 THEN round(ps.unassigned::numeric / ps.resolved * 100, 1) ELSE NULL END,
      'avg_assignment_minutes', round(ps.avg_assignment_minutes::numeric, 1)
    ),
    'by_municipality', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('municipality', pickup_municipality, 'count', n)) FROM geography),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM current_stats cs, previous_stats ps, current_ratings cr;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_operational_kpis(integer) TO authenticated;

-- ─── Centre de notifications internes ───────────────────────────────────
-- Distinct de admin_activity_log (migration 045) : celui-ci trace les
-- actions FAITES par les admins ; celui-ci signale aux admins des
-- évènements qui méritent leur attention, quel qu'en soit l'auteur
-- (patient, chauffeur...).
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  target_table text,
  target_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  read_by uuid REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.admin_notifications IS
  'Flux d''évènements nécessitant l''attention d''un admin (nouvelle candidature chauffeur, annulation, avis à faible note...). Alimenté uniquement par des triggers SECURITY DEFINER (voir notify_admin_*).';

CREATE INDEX admin_notifications_created_at_idx ON public.admin_notifications (created_at DESC);
CREATE INDEX admin_notifications_unread_idx ON public.admin_notifications (read_at) WHERE read_at IS NULL;

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_notifications: admin read" ON public.admin_notifications
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_notifications: admin mark read" ON public.admin_notifications
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seules les colonnes de suivi de lecture sont modifiables par un admin via
-- le client normal ; type/title/body/target_* restent en écriture seule
-- pour les triggers SECURITY DEFINER ci-dessous. Insert/delete réservés de
-- la même façon (aucune ligne créée ou supprimée hors trigger).
REVOKE INSERT, DELETE ON public.admin_notifications FROM authenticated, anon;
REVOKE UPDATE ON public.admin_notifications FROM authenticated;
GRANT UPDATE (read_at, read_by) ON public.admin_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admin_new_driver_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved_at IS NULL AND NEW.rejected_at IS NULL THEN
    INSERT INTO public.admin_notifications (type, title, body, target_table, target_id)
    SELECT
      'driver_application',
      'Nouvelle candidature chauffeur',
      p.full_name,
      'drivers_details',
      NEW.profile_id::text
    FROM public.profiles p
    WHERE p.id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admin_new_driver_application() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_admin_on_driver_application
  AFTER INSERT ON public.drivers_details
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_driver_application();

CREATE OR REPLACE FUNCTION public.notify_admin_booking_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO public.admin_notifications (type, title, body, target_table, target_id)
    VALUES (
      'booking_cancelled',
      'Réservation annulée — ' || NEW.reference_code,
      COALESCE(NEW.cancellation_reason, 'Aucun motif renseigné.'),
      'bookings',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admin_booking_cancelled() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_admin_on_booking_cancelled
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_booking_cancelled();

CREATE OR REPLACE FUNCTION public.notify_admin_low_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reference text;
BEGIN
  IF NEW.rater_role = 'patient' AND NEW.rating <= 2 THEN
    SELECT reference_code INTO v_reference FROM public.bookings WHERE id = NEW.booking_id;
    INSERT INTO public.admin_notifications (type, title, body, target_table, target_id)
    VALUES (
      'low_rating',
      'Avis à faible note — ' || COALESCE(v_reference, NEW.booking_id::text),
      NEW.rating::text || '/5' || COALESCE(' — ' || NEW.comment, ''),
      'booking_ratings',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admin_low_rating() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_admin_on_low_rating
  AFTER INSERT ON public.booking_ratings
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_low_rating();
