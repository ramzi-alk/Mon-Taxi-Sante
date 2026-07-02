-- Sprint 3 (Sprint 8 in ROADMAP.md's continuous numbering) — panel admin :
-- répertoire chauffeurs, suspension manuelle, modération des avis.

-- ─── Modération des avis mutuels ────────────────────────────────────────────
-- Pas de colonne REVOKE ici : booking_ratings a déjà une policy RLS
-- "booking_ratings: admin all" (migration 033), donc l'admin peut écrire ces
-- colonnes directement via le client habituel, sans RPC dédiée.

ALTER TABLE public.booking_ratings
  ADD COLUMN hidden_at timestamptz,
  ADD COLUMN hidden_by uuid REFERENCES public.profiles(id);

COMMENT ON COLUMN public.booking_ratings.hidden_at IS
  'Modération admin : commentaire masqué (abus, diffamation...). NULL = visible. La note (rating) elle-même n''est pas affectée, seul le texte est concerné.';

-- ─── Suspension manuelle d'un chauffeur ─────────────────────────────────────
-- pool_suspended_until est protégée par un REVOKE UPDATE FROM authenticated
-- (migration 030) : même l'admin, via le client anon-key normal, ne peut
-- pas l'écrire directement. Cette fonction SECURITY DEFINER rouvre l'accès,
-- réservé aux admins (vérifié explicitement, is_admin() ne suffit pas à lui
-- seul à documenter l'intention pour un futur lecteur de ce fichier).

CREATE OR REPLACE FUNCTION public.admin_set_driver_suspension(
  p_driver_profile_id uuid,
  p_until timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  UPDATE public.drivers_details
  SET pool_suspended_until = p_until
  WHERE profile_id = p_driver_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'driver_not_found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_driver_suspension(uuid, timestamptz) TO authenticated;

-- ─── Répertoire chauffeurs (liste agrégée) ──────────────────────────────────
-- Agrégation (courses terminées, note moyenne) faite côté Postgres plutôt
-- que par N+1 requêtes côté client — même logique que get_booking_status_counts
-- (migration 042). SECURITY INVOKER : la RLS de profiles/drivers_details/
-- bookings/booking_ratings s'applique normalement, is_admin() est vérifié
-- explicitement en plus pour documenter l'intention (et éviter un résultat
-- vide/trompeur si jamais RLS changeait sans que cette fonction suive).

CREATE OR REPLACE FUNCTION public.get_admin_driver_directory()
RETURNS TABLE (
  profile_id uuid,
  full_name text,
  email text,
  phone text,
  vehicle_type vehicle_type,
  vehicle_registration text,
  availability driver_availability,
  approved_at timestamptz,
  pool_suspended_until timestamptz,
  suspicious_cancellation_count smallint,
  subscription_status subscription_status,
  completed_rides bigint,
  average_rating numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.phone,
    dd.vehicle_type,
    dd.vehicle_registration,
    dd.availability,
    dd.approved_at,
    dd.pool_suspended_until,
    dd.suspicious_cancellation_count,
    dd.subscription_status,
    COUNT(b.id) FILTER (WHERE b.status = 'completed') AS completed_rides,
    ROUND(AVG(br.rating) FILTER (WHERE br.rater_role = 'patient'), 1) AS average_rating
  FROM public.drivers_details dd
  JOIN public.profiles p ON p.id = dd.profile_id
  LEFT JOIN public.bookings b ON b.driver_id = p.id
  LEFT JOIN public.booking_ratings br ON br.booking_id = b.id AND br.rater_role = 'patient'
  WHERE dd.approved_at IS NOT NULL
  GROUP BY p.id, p.full_name, p.email, p.phone, dd.vehicle_type, dd.vehicle_registration,
           dd.availability, dd.approved_at, dd.pool_suspended_until,
           dd.suspicious_cancellation_count, dd.subscription_status
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_driver_directory() TO authenticated;
