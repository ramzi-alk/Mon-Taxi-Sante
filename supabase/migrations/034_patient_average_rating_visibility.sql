-- =============================================================================
-- Mon Taxi Santé — Visibilité des moyennes de notes façon Uber
--
-- Avant d'accepter une course, un chauffeur doit pouvoir voir la note
-- moyenne du patient (comme la note du passager affichée à un chauffeur
-- Uber avant acceptation) : patient_average_rating(), exposée sur
-- bookings_pool_for_drivers (et bookings_active_for_driver, par cohérence
-- une fois la course acceptée).
--
-- Symétriquement, le patient doit voir la note moyenne du chauffeur dès
-- l'acceptation de sa course, y compris dans l'e-mail "Chauffeur affecté"
-- (bookingAcceptedEmail) — driver_average_rating() existe déjà depuis la
-- migration 033, on la rend seulement accessible au service_role utilisé
-- par les server functions d'e-mail (src/server/email.ts).
-- =============================================================================

-- ─── patient_average_rating(): note moyenne d'un patient (vue chauffeur) ──

CREATE FUNCTION public.patient_average_rating(p_patient_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE
AS $$
  SELECT ROUND(AVG(br.rating)::numeric, 1)
  FROM public.booking_ratings br
  JOIN public.bookings b ON b.id = br.booking_id
  WHERE b.patient_id = p_patient_id AND br.rater_role = 'driver';
$$;

COMMENT ON FUNCTION public.patient_average_rating IS
  'Note moyenne (1-5, 1 décimale) reçue par un patient de la part des chauffeurs, toutes courses confondues. NULL si aucune note encore reçue. Symétrique de driver_average_rating (migration 033).';

REVOKE ALL ON FUNCTION public.patient_average_rating(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patient_average_rating(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.driver_average_rating(UUID) TO service_role;

-- ─── bookings_pool_for_drivers: + note moyenne du patient ─────────────────

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
  public.patient_average_rating(b.patient_id) AS patient_rating_avg
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
  );

COMMENT ON VIEW public.bookings_pool_for_drivers IS
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT, medical notes, birth date) for driver consumption. Scoped to the calling driver''s own online status, vehicle/equipment compatibility, absence de suspension (pool_suspended_until), et (when configured) acceptance_radius_km around their parking position. Exposes distance_to_driver_km for sorting/display et désormais patient_rating_avg (note moyenne du patient reçue des chauffeurs, façon note du passager affichée avant acceptation chez Uber). Masque le téléphone patient et l''adresse exacte de prise en charge (commune affichée à la place, lat/lng à NULL) tant que la course n''est pas acceptée. Filtre/expose priority_driver_id/priority_expires_at : une séance de série reste prioritairement réservée au chauffeur ayant accepté la séance précédente avant de rouvrir au pool général.';

-- ─── bookings_active_for_driver: + note moyenne du patient (cohérence) ────

CREATE OR REPLACE VIEW public.bookings_active_for_driver
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  b.patient_full_name,
  b.patient_phone,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_address
    ELSE COALESCE(b.pickup_municipality, b.pickup_address)
  END AS pickup_address,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_lat
    ELSE NULL
  END AS pickup_lat,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_lng
    ELSE NULL
  END AS pickup_lng,
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
    WHEN b.status IN ('accepted', 'in_progress')
         AND dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL
         AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL
    THEN public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL
  END AS distance_to_driver_km,
  driver_br.rating AS driver_rating_given,
  patient_br.rating AS patient_rating_received,
  public.patient_average_rating(b.patient_id) AS patient_rating_avg
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
LEFT JOIN public.booking_ratings driver_br ON driver_br.booking_id = b.id AND driver_br.rater_role = 'driver'
LEFT JOIN public.booking_ratings patient_br ON patient_br.booking_id = b.id AND patient_br.rater_role = 'patient'
WHERE b.driver_id = auth.uid()
  AND b.status IN ('accepted', 'in_progress', 'completed');

COMMENT ON VIEW public.bookings_active_for_driver IS
  'Courses acceptées/en cours/terminées du chauffeur connecté (équivalent de fetchDriverRides), avec distance_to_driver_km, driver_rating_given (note que CE chauffeur a donnée au patient pour cette course, NULL = pas encore noté), patient_rating_received (note que le patient a donnée au chauffeur pour cette course, visible dès soumission) et patient_rating_avg (note moyenne du patient toutes courses confondues). L''adresse exacte de prise en charge reste masquée hors fenêtre de révélation (voir pickup_address_revealed, migration 031).';
