-- =============================================================================
-- Mon Taxi Santé — champs manquants pour le justificatif de transport (Sprint 4)
--
-- picked_up_at/completed_at sont déjà stampés par start_ride()/complete_ride()
-- (migration 018) mais jamais exposés par bookings_active_for_driver — le
-- justificatif de transport PDF généré côté chauffeur en a besoin pour
-- attester les horaires réels de prise en charge, pas seulement l'horaire
-- prévu (pickup_datetime). reference_code (déjà utilisé côté patient) est
-- ajouté pour la même raison — un numéro de course lisible plutôt que l'UUID
-- brut sur un document imprimé.
-- =============================================================================

CREATE OR REPLACE VIEW public.bookings_active_for_driver
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  b.patient_full_name,
  b.patient_phone,
  CASE
    WHEN pickup_address_revealed(b.status, b.pickup_datetime) THEN b.pickup_address
    ELSE COALESCE(b.pickup_municipality, b.pickup_address)
  END AS pickup_address,
  CASE
    WHEN pickup_address_revealed(b.status, b.pickup_datetime) THEN b.pickup_lat
    ELSE NULL::double precision
  END AS pickup_lat,
  CASE
    WHEN pickup_address_revealed(b.status, b.pickup_datetime) THEN b.pickup_lng
    ELSE NULL::double precision
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
    WHEN (b.status = ANY (ARRAY['accepted'::booking_status, 'in_progress'::booking_status])) AND dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL THEN haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL::numeric
  END AS distance_to_driver_km,
  driver_br.rating AS driver_rating_given,
  patient_br.rating AS patient_rating_received,
  patient_average_rating(b.patient_id) AS patient_rating_avg,
  b.pmt_declared,
  b.is_hospitalization,
  b.series_index,
  b.series_total,
  b.series_id,
  b.actual_price,
  b.picked_up_at,
  b.completed_at,
  b.reference_code
FROM bookings b
  JOIN drivers_details dd ON dd.profile_id = auth.uid()
  LEFT JOIN booking_ratings driver_br ON driver_br.booking_id = b.id AND driver_br.rater_role = 'driver'::booking_rating_role
  LEFT JOIN booking_ratings patient_br ON patient_br.booking_id = b.id AND patient_br.rater_role = 'patient'::booking_rating_role
WHERE b.driver_id = auth.uid() AND (b.status = ANY (ARRAY['accepted'::booking_status, 'in_progress'::booking_status, 'completed'::booking_status]));

COMMENT ON VIEW public.bookings_active_for_driver IS 'Courses actives/terminées du chauffeur connecté, avec adresse de prise en charge révélée progressivement, actual_price (Sprint 4), et picked_up_at/completed_at/reference_code pour le justificatif de transport PDF.';
