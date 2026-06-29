-- =============================================================================
-- Mon Taxi Santé — fenêtre de révélation d'adresse adaptée au délai du RDV
--
-- La migration 030 révélait l'adresse exacte de prise en charge à un chauffeur
-- ayant déjà accepté la course dès qu'il restait moins de 2h avant le
-- pickup, quel que soit le délai initial de réservation. Pour une course
-- réservée plusieurs jours/semaines à l'avance (cas typique d'une série
-- PMT), ce seuil fixe de 2h est trop tardif pour permettre au chauffeur
-- d'organiser sereinement son trajet (vérifier l'itinéraire, le temps de
-- route, etc.) la veille par exemple.
--
-- On rend donc le seuil flexible :
--   - Si le rendez-vous est le jour même (jour J, fuseau Europe/Paris) :
--     seuil inchangé, révélation à 2h du pickup.
--   - Sinon (le rendez-vous a lieu un autre jour calendaire — demain, dans
--     une semaine, etc.) : révélation à 24h du pickup, pour laisser au
--     chauffeur une vraie marge de préparation tout en conservant une
--     fenêtre de contact direct hors plateforme bien plus courte que le
--     délai total entre acceptation et prise en charge.
-- Comme avant : in_progress/completed révèle toujours l'adresse ; en deçà
-- du seuil applicable, la commune (pickup_municipality) reste affichée à
-- la place.
-- =============================================================================

-- ─── pickup_address_revealed(): seuil de révélation selon le délai du RDV ──

CREATE FUNCTION public.pickup_address_revealed(
  p_status          booking_status,
  p_pickup_datetime TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT p_status IN ('in_progress', 'completed')
    OR (
      CASE
        WHEN (p_pickup_datetime AT TIME ZONE 'Europe/Paris')::date
             = (now() AT TIME ZONE 'Europe/Paris')::date
        THEN p_pickup_datetime <= now() + interval '2 hours'
        ELSE p_pickup_datetime <= now() + interval '24 hours'
      END
    );
$$;

COMMENT ON FUNCTION public.pickup_address_revealed IS
  'Détermine si l''adresse exacte de prise en charge (et ses coordonnées) doit être révélée à un chauffeur ayant déjà accepté la course, ou si la commune doit continuer à être affichée à la place. Toujours vrai si in_progress/completed. Sinon, seuil de 2h avant le pickup si le rendez-vous est le jour même (Europe/Paris), ou de 24h si c''est un autre jour calendaire — pour laisser plus de marge de préparation sur les courses réservées longtemps à l''avance (séries PMT) sans pour autant révéler l''adresse trop tôt. Utilisé par bookings_active_for_driver.';

REVOKE ALL ON FUNCTION public.pickup_address_revealed(booking_status, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pickup_address_revealed(booking_status, TIMESTAMPTZ) TO authenticated;

-- ─── bookings_active_for_driver: seuil de révélation flexible ─────────────

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
  END AS distance_to_driver_km
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
WHERE b.driver_id = auth.uid()
  AND b.status IN ('accepted', 'in_progress', 'completed');

COMMENT ON VIEW public.bookings_active_for_driver IS
  'Courses acceptées/en cours/terminées du chauffeur connecté (équivalent de fetchDriverRides), avec distance_to_driver_km calculée pour les courses accepted/in_progress comme dans bookings_pool_for_drivers. L''adresse exacte de prise en charge (et ses coordonnées) n''est exposée que selon pickup_address_revealed() (2h avant le pickup si jour J, 24h sinon, ou dès in_progress/completed) ; au-delà, la commune (pickup_municipality) est affichée à la place, pour limiter la fenêtre de contact direct hors plateforme sur les courses acceptées longtemps à l''avance (séries PMT notamment) tout en laissant une marge de préparation raisonnable. Repose sur la policy RLS "bookings: driver pool view" déjà en place (driver_id = auth.uid() pour ces statuts), pas de SECURITY DEFINER nécessaire.';
