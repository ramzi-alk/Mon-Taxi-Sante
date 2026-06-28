-- =============================================================================
-- 1) Backfill ciblé de distance_km : les courses créées avant la migration 022
--    sont restées à distance_km = NULL (le trigger ne se déclenche qu'à
--    l'insertion/mise à jour des colonnes lat/lng). On ne retouche que les
--    courses à venir (pickup_datetime > now()) pour éviter qu'une réévaluation
--    des contraintes CHECK fasse échouer la mise à jour d'une course passée,
--    comme prévenu dans le commentaire de la migration 022.
-- 2) distance_to_driver_km (distance chauffeur -> prise en charge) n'était
--    exposée que pour les courses 'available' du pool (bookings_pool_for_drivers).
--    Une fois la course acceptée, elle disparaît de cette vue et RideCard
--    retombe sur le simple libellé "Départ" sans distance. On expose donc la
--    même info pour les courses actives du chauffeur via une nouvelle vue.
-- =============================================================================

UPDATE public.bookings
SET pickup_lat = pickup_lat
WHERE distance_km IS NULL
  AND pickup_lat IS NOT NULL
  AND pickup_lng IS NOT NULL
  AND dropoff_lat IS NOT NULL
  AND dropoff_lng IS NOT NULL
  AND pickup_datetime > now();

CREATE OR REPLACE VIEW public.bookings_active_for_driver
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  b.patient_full_name,
  b.patient_phone,
  b.pickup_address,
  b.pickup_lat,
  b.pickup_lng,
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
  END AS distance_to_driver_km
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
WHERE b.driver_id = auth.uid()
  AND b.status IN ('accepted', 'in_progress', 'completed');

COMMENT ON VIEW public.bookings_active_for_driver IS
  'Courses acceptées/en cours/terminées du chauffeur connecté (équivalent de fetchDriverRides), avec distance_to_driver_km calculée pour les courses accepted/in_progress comme dans bookings_pool_for_drivers — repose sur la policy RLS "bookings: driver pool view" déjà en place (driver_id = auth.uid() pour ces statuts), pas de SECURITY DEFINER nécessaire.';
