-- =============================================================================
-- Mon Taxi Santé — Refus de course par un chauffeur dans le pool
--
-- Jusqu'ici un chauffeur ne pouvait qu'accepter une course du pool ou
-- l'ignorer (elle restait affichée indéfiniment). On ajoute un vrai "refus" :
-- la course disparaît du pool de CE chauffeur (carte et liste), sans affecter
-- sa visibilité pour les autres chauffeurs compatibles — elle reste
-- 'available' et peut toujours être acceptée par quelqu'un d'autre.
--
-- booking_driver_refusals stocke une ligne par (course, chauffeur ayant
-- refusé). Pas de policy INSERT directe : l'écriture passe uniquement par
-- refuse_ride() SECURITY DEFINER (même logique que booking_ratings /
-- rate_booking_as_driver, migration 033).
-- =============================================================================

CREATE TABLE public.booking_driver_refusals (
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, driver_id)
);

COMMENT ON TABLE public.booking_driver_refusals IS
  'Une ligne par (course, chauffeur) qui a explicitement refusé cette course depuis le pool. Masque la course pour ce chauffeur uniquement (voir bookings_pool_for_drivers) — la course reste disponible pour les autres chauffeurs compatibles.';

CREATE INDEX idx_booking_driver_refusals_driver ON public.booking_driver_refusals(driver_id);

ALTER TABLE public.booking_driver_refusals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_driver_refusals: driver read own"
  ON public.booking_driver_refusals FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "booking_driver_refusals: admin all"
  ON public.booking_driver_refusals FOR ALL
  USING (public.is_admin());

-- ─── refuse_ride(): chauffeur refuse une course du pool ───────────────────

CREATE FUNCTION public.refuse_ride(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_driver() THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id) THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  INSERT INTO public.booking_driver_refusals (booking_id, driver_id)
  VALUES (p_booking_id, auth.uid())
  ON CONFLICT (booking_id, driver_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.refuse_ride IS
  'Le chauffeur connecté refuse une course du pool : elle n''apparaîtra plus dans son propre pool (carte/liste), mais reste disponible pour les autres chauffeurs compatibles. Idempotent (ON CONFLICT DO NOTHING).';

REVOKE ALL ON FUNCTION public.refuse_ride(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refuse_ride(UUID) TO authenticated;

-- ─── bookings_pool_for_drivers: exclut les courses refusées par CE chauffeur

CREATE OR REPLACE VIEW public.bookings_pool_for_drivers
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  split_part(b.patient_full_name, ' ', 1) AS patient_first_name,
  NULL::text AS patient_phone,
  COALESCE(b.pickup_municipality, b.pickup_address) AS pickup_address,
  NULL::double precision AS pickup_lat,
  NULL::double precision AS pickup_lng,
  b.dropoff_address,
  b.dropoff_lat,
  b.dropoff_lng,
  b.distance_km,
  b.pickup_datetime,
  b.return_datetime,
  b.vehicle_type,
  b.trip_type,
  b.requires_wheelchair,
  b.requires_stretcher,
  b.requires_oxygen,
  b.passenger_count,
  b.estimated_price,
  b.status,
  b.created_at,
  CASE
    WHEN dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL
         AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL
    THEN public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL
  END AS distance_to_driver_km,
  b.priority_driver_id,
  b.priority_expires_at,
  public.patient_average_rating(b.patient_id) AS patient_rating_avg,
  b.pmt_declared,
  b.is_hospitalization,
  b.series_index,
  b.series_total,
  b.series_id
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
WHERE b.status = 'available'
  AND dd.availability = 'online'
  AND (dd.pool_suspended_until IS NULL OR dd.pool_suspended_until <= now())
  AND public.driver_matches_booking(
    b.vehicle_type, b.requires_wheelchair, b.requires_stretcher, b.requires_oxygen,
    dd.vehicle_type, dd.pmr_equipped, dd.stretcher_equipped, dd.oxygen_equipped
  )
  AND (
    dd.acceptance_radius_km IS NULL
    OR dd.parking_lat IS NULL OR dd.parking_lng IS NULL
    OR b.pickup_lat IS NULL OR b.pickup_lng IS NULL
    OR public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng) <= dd.acceptance_radius_km
  )
  AND (
    b.priority_driver_id IS NULL
    OR b.priority_driver_id = auth.uid()
    OR b.priority_expires_at IS NULL
    OR b.priority_expires_at <= now()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.booking_driver_refusals bdr
    WHERE bdr.booking_id = b.id AND bdr.driver_id = auth.uid()
  );

COMMENT ON VIEW public.bookings_pool_for_drivers IS
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT file, medical notes, birth date) for driver consumption — seuls pmt_declared/is_hospitalization (booléens, non identifiants) et series_id/series_index/series_total sont exposés pour aider le chauffeur à décider avant acceptation. Scoped to the calling driver''s own online status, vehicle/equipment compatibility, absence de suspension (pool_suspended_until), et (when configured) acceptance_radius_km around their parking position. Exposes distance_to_driver_km for sorting/display et patient_rating_avg (note moyenne du patient reçue des chauffeurs, façon note du passager affichée avant acceptation chez Uber). Masque le téléphone patient et l''adresse exacte de prise en charge (commune affichée à la place, lat/lng à NULL) tant que la course n''est pas acceptée. Filtre/expose priority_driver_id/priority_expires_at : une séance de série reste prioritairement réservée au chauffeur ayant accepté la séance précédente avant de rouvrir au pool général. Exclut désormais les courses explicitement refusées par CE chauffeur (booking_driver_refusals, voir refuse_ride) — invisibles pour lui seul, toujours disponibles pour les autres chauffeurs compatibles.';
