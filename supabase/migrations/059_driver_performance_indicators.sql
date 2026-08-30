-- =============================================================================
-- Mon Taxi Santé — indicateurs de performance personnels du chauffeur
--
-- Jusqu'ici le chauffeur ne voyait que des chiffres bruts (courses, km,
-- gains) sans aucun signal sur la "santé" de son compte avant d'être
-- suspendu (pool_suspended_until, suspicious_cancellation_count) : ni taux
-- d'acceptation, ni taux d'annulation, ni tendance de note. Exploite
-- booking_driver_refusals (migration 041) et booking_driver_cancellations
-- (migration 057) plutôt que bookings.driver_id seul, qui ne garde aucune
-- trace d'une course annulée après acceptation (driver_id repasse à NULL).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_driver_performance()
RETURNS TABLE (
  rides_accepted_total   INTEGER,
  rides_refused_total    INTEGER,
  rides_cancelled_total  INTEGER,
  acceptance_rate        NUMERIC,
  cancellation_rate       NUMERIC,
  rating_avg_recent      NUMERIC,
  rating_avg_previous    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accepted  INTEGER;
  v_refused   INTEGER;
  v_cancelled INTEGER;
BEGIN
  IF NOT public.is_driver() THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  SELECT count(*) INTO v_accepted
  FROM public.bookings
  WHERE driver_id = auth.uid();

  SELECT count(*) INTO v_cancelled
  FROM public.booking_driver_cancellations
  WHERE driver_id = auth.uid();

  -- Une course annulée après acceptation ne garde plus driver_id = moi sur
  -- bookings (elle est retournée au pool) : le total d'acceptations réelles
  -- inclut donc aussi celles qui ont ensuite été annulées.
  v_accepted := v_accepted + v_cancelled;

  SELECT count(*) INTO v_refused
  FROM public.booking_driver_refusals
  WHERE driver_id = auth.uid();

  RETURN QUERY SELECT
    v_accepted,
    v_refused,
    v_cancelled,
    CASE WHEN (v_accepted + v_refused) > 0
      THEN round(100.0 * v_accepted / (v_accepted + v_refused), 1)
      ELSE NULL END,
    CASE WHEN v_accepted > 0
      THEN round(100.0 * v_cancelled / v_accepted, 1)
      ELSE NULL END,
    (SELECT round(avg(br.rating), 2)
       FROM public.booking_ratings br
       JOIN public.bookings b ON b.id = br.booking_id
       WHERE b.driver_id = auth.uid()
         AND br.rater_role = 'patient'
         AND br.created_at >= now() - interval '30 days'),
    (SELECT round(avg(br.rating), 2)
       FROM public.booking_ratings br
       JOIN public.bookings b ON b.id = br.booking_id
       WHERE b.driver_id = auth.uid()
         AND br.rater_role = 'patient'
         AND br.created_at >= now() - interval '60 days'
         AND br.created_at < now() - interval '30 days');
END;
$$;

COMMENT ON FUNCTION public.get_my_driver_performance() IS
  'Indicateurs de performance du chauffeur connecté : taux d''acceptation (accepté / (accepté+refusé)), taux d''annulation (annulé après acceptation / accepté), et tendance de note (moyenne des 30 derniers jours vs les 30 jours précédents, notes patient uniquement). rides_accepted_total inclut les courses annulées depuis (booking_driver_cancellations), qui ne sont plus rattachées au chauffeur via bookings.driver_id une fois retournées au pool.';

REVOKE ALL ON FUNCTION public.get_my_driver_performance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_driver_performance() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_driver_performance() TO authenticated;

-- ─── get_my_cancellations(): historique perso pour "Mon compte" ────────────

CREATE OR REPLACE FUNCTION public.get_my_cancellations()
RETURNS TABLE (
  booking_id      UUID,
  pickup_address  TEXT,
  pickup_datetime TIMESTAMPTZ,
  reason          TEXT,
  was_suspicious  BOOLEAN,
  cancelled_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    bdc.booking_id,
    COALESCE(b.pickup_municipality, b.pickup_address),
    b.pickup_datetime,
    bdc.reason,
    bdc.was_suspicious,
    bdc.cancelled_at
  FROM public.booking_driver_cancellations bdc
  JOIN public.bookings b ON b.id = bdc.booking_id
  WHERE bdc.driver_id = auth.uid()
  ORDER BY bdc.cancelled_at DESC
  LIMIT 50;
$$;

COMMENT ON FUNCTION public.get_my_cancellations() IS
  'Historique des 50 dernières annulations du chauffeur connecté (motif, horodatage, si jugée suspecte) — affiché sur "Mon compte" pour la transparence sur pool_suspended_until/suspicious_cancellation_count. Adresse de prise en charge affichée en commune uniquement (cohérent avec le masquage du pool), la course n''étant plus la sienne une fois annulée.';

REVOKE ALL ON FUNCTION public.get_my_cancellations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_cancellations() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_cancellations() TO authenticated;
