-- =============================================================================
-- Mon Taxi Santé — révélation tardive de l'adresse + fiabilité chauffeur
--
-- 1) Jusqu'ici, une fois la course acceptée, bookings_active_for_driver
--    (migration 024) exposait immédiatement l'adresse exacte de prise en
--    charge, même pour une course prévue plusieurs jours à l'avance (cas
--    typique d'une série PMT, cf. migration 028). Cette fenêtre longue entre
--    acceptation et prise en charge réelle est la plus propice à un contact
--    direct hors plateforme. On ne révèle donc désormais l'adresse exacte
--    (et ses coordonnées) qu'à l'approche du rendez-vous — 2h avant le
--    pickup, ou dès que la course est in_progress/completed — sinon la
--    commune (pickup_municipality) continue d'être affichée, comme dans le
--    pool. L'adresse de destination n'a jamais été masquée et ne le devient
--    pas ici.
--
-- 2) Pénalité de fiabilité : un chauffeur qui annule une course très peu de
--    temps après l'avoir acceptée, alors que la prise en charge reste
--    lointaine, est dans le profil typique d'une désintermédiation (il a vu
--    l'adresse/le téléphone complets, recontacte le patient en privé, puis
--    annule en chauffeur quasi instantanément pour se "désengager" de
--    l'app). cancel_ride_by_driver() détecte ce motif (annulation < 10 min
--    après acceptation ET prise en charge encore à plus de 2h) et incrémente
--    un compteur sur drivers_details ; à la 3e occurrence, l'accès au pool
--    est suspendu 7 jours (bookings_pool_for_drivers cesse de lister des
--    courses pour ce chauffeur). Les colonnes de compteur/suspension sont en
--    lecture seule pour le chauffeur (REVOKE UPDATE ciblé) : seules les
--    fonctions SECURITY DEFINER peuvent les modifier, pour qu'un chauffeur
--    ne puisse pas réinitialiser lui-même son propre compteur via une simple
--    requête PATCH REST sur sa ligne drivers_details.
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.accepted_at IS
  'Horodatage de l''acceptation par le chauffeur (accept_ride). Remis à NULL si la course retourne au pool (cancel_ride_by_driver). Sert à détecter les annulations suspectes (cf. cancel_ride_by_driver).';

ALTER TABLE public.drivers_details
  ADD COLUMN IF NOT EXISTS suspicious_cancellation_count SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pool_suspended_until TIMESTAMPTZ;

COMMENT ON COLUMN public.drivers_details.suspicious_cancellation_count IS
  'Nombre d''annulations jugées suspectes (acceptée puis annulée en moins de 10 min, alors que la prise en charge restait à plus de 2h) — cf. cancel_ride_by_driver. Modifiable uniquement par les fonctions SECURITY DEFINER (voir REVOKE plus bas).';
COMMENT ON COLUMN public.drivers_details.pool_suspended_until IS
  'Si renseigné et futur, le chauffeur ne voit plus aucune course dans bookings_pool_for_drivers (suspension temporaire suite à des annulations suspectes répétées). Modifiable uniquement par les fonctions SECURITY DEFINER.';

-- Un chauffeur peut lire ses propres compteurs (transparence) mais ne peut
-- pas les modifier directement via une UPDATE REST sur sa ligne — seules
-- les fonctions SECURITY DEFINER (qui s'exécutent avec les droits du
-- propriétaire de la fonction) contournent cette restriction.
REVOKE UPDATE (suspicious_cancellation_count, pool_suspended_until)
  ON public.drivers_details FROM authenticated;

-- ─── accept_ride(): bloque un chauffeur suspendu, stampe accepted_at ───────

CREATE OR REPLACE FUNCTION public.accept_ride(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status               booking_status;
  v_vehicle_type         booking_vehicle_type;
  v_requires_wheelchair  BOOLEAN;
  v_requires_stretcher   BOOLEAN;
  v_requires_oxygen      BOOLEAN;
  v_series_id            UUID;
  v_priority_driver_id   UUID;
  v_priority_expires_at  TIMESTAMPTZ;
  v_driver_vehicle_type  vehicle_type;
  v_pmr_equipped         BOOLEAN;
  v_stretcher_equipped   BOOLEAN;
  v_oxygen_equipped      BOOLEAN;
  v_pool_suspended_until TIMESTAMPTZ;
BEGIN
  IF NOT public.is_driver() THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  SELECT status, vehicle_type, requires_wheelchair, requires_stretcher, requires_oxygen,
         series_id, priority_driver_id, priority_expires_at
  INTO v_status, v_vehicle_type, v_requires_wheelchair, v_requires_stretcher, v_requires_oxygen,
       v_series_id, v_priority_driver_id, v_priority_expires_at
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'booking_not_available';
  END IF;

  IF v_priority_driver_id IS NOT NULL
     AND v_priority_driver_id <> auth.uid()
     AND v_priority_expires_at IS NOT NULL
     AND v_priority_expires_at > now() THEN
    RAISE EXCEPTION 'booking_priority_reserved';
  END IF;

  SELECT vehicle_type, pmr_equipped, stretcher_equipped, oxygen_equipped, pool_suspended_until
  INTO v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped, v_pool_suspended_until
  FROM public.drivers_details
  WHERE profile_id = auth.uid();

  IF v_driver_vehicle_type IS NULL THEN
    RAISE EXCEPTION 'driver_profile_incomplete';
  END IF;

  IF v_pool_suspended_until IS NOT NULL AND v_pool_suspended_until > now() THEN
    RAISE EXCEPTION 'driver_pool_suspended';
  END IF;

  IF NOT public.driver_matches_booking(
    v_vehicle_type, v_requires_wheelchair, v_requires_stretcher, v_requires_oxygen,
    v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped
  ) THEN
    RAISE EXCEPTION 'vehicle_not_compatible';
  END IF;

  UPDATE public.bookings
  SET driver_id = auth.uid(), status = 'accepted', accepted_at = now(),
      priority_driver_id = NULL, priority_expires_at = NULL
  WHERE id = p_booking_id AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_already_taken';
  END IF;

  IF v_series_id IS NOT NULL THEN
    UPDATE public.bookings
    SET priority_driver_id = auth.uid(),
        priority_expires_at = LEAST(now() + interval '12 hours', pickup_datetime - interval '1 hour')
    WHERE series_id = v_series_id
      AND id <> p_booking_id
      AND status = 'available';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.accept_ride(UUID) IS
  'Acceptation d''une course par un chauffeur connecté, sous réserve de compatibilité véhicule/équipement (driver_matches_booking), de l''éventuelle fenêtre de priorité de série, et de l''absence de suspension pool_suspended_until. Stampe accepted_at (sert à détecter les annulations suspectes dans cancel_ride_by_driver) et propage la priorité de série aux séances restantes.';

-- ─── cancel_ride_by_driver(): détecte l'annulation suspecte ────────────────

CREATE OR REPLACE FUNCTION public.cancel_ride_by_driver(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status         booking_status;
  v_accepted_at    TIMESTAMPTZ;
  v_pickup_datetime TIMESTAMPTZ;
  v_is_suspicious  BOOLEAN;
  v_new_count      SMALLINT;
BEGIN
  SELECT status, accepted_at, pickup_datetime
  INTO v_status, v_accepted_at, v_pickup_datetime
  FROM public.bookings
  WHERE id = p_booking_id AND driver_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'accepted' THEN
    RAISE EXCEPTION 'booking_not_cancellable_by_driver';
  END IF;

  v_is_suspicious := v_accepted_at IS NOT NULL
    AND now() - v_accepted_at < interval '10 minutes'
    AND v_pickup_datetime - now() > interval '2 hours';

  UPDATE public.bookings
  SET status = 'available', driver_id = NULL, accepted_at = NULL
  WHERE id = p_booking_id;

  IF v_is_suspicious THEN
    UPDATE public.drivers_details
    SET suspicious_cancellation_count = suspicious_cancellation_count + 1
    WHERE profile_id = auth.uid()
    RETURNING suspicious_cancellation_count INTO v_new_count;

    IF v_new_count >= 3 THEN
      UPDATE public.drivers_details
      SET pool_suspended_until = now() + interval '7 days'
      WHERE profile_id = auth.uid();
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.cancel_ride_by_driver IS
  'Driver backs out of their own accepted ride. Returns it to the pool (available, driver_id/accepted_at cleared) rather than cancelling the patient''s reservation. Scoped to driver_id = auth.uid(); only allowed from accepted. Incrémente suspicious_cancellation_count si l''annulation intervient moins de 10 min après acceptation alors que la prise en charge restait à plus de 2h (profil typique de désintermédiation) ; suspend l''accès au pool 7 jours à la 3e occurrence. The app is responsible for notifying the patient (see notifyRideUnassignedServerFn).';

-- ─── bookings_active_for_driver: n'expose l'adresse exacte de prise en
-- charge qu'à l'approche du rendez-vous (≤ 2h) ou une fois la course
-- in_progress/completed ; sinon la commune est affichée, comme dans le pool.

CREATE OR REPLACE VIEW public.bookings_active_for_driver
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  b.patient_full_name,
  b.patient_phone,
  CASE
    WHEN b.status IN ('in_progress', 'completed')
         OR b.pickup_datetime <= now() + interval '2 hours'
    THEN b.pickup_address
    ELSE COALESCE(b.pickup_municipality, b.pickup_address)
  END AS pickup_address,
  CASE
    WHEN b.status IN ('in_progress', 'completed')
         OR b.pickup_datetime <= now() + interval '2 hours'
    THEN b.pickup_lat
    ELSE NULL
  END AS pickup_lat,
  CASE
    WHEN b.status IN ('in_progress', 'completed')
         OR b.pickup_datetime <= now() + interval '2 hours'
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
  'Courses acceptées/en cours/terminées du chauffeur connecté (équivalent de fetchDriverRides), avec distance_to_driver_km calculée pour les courses accepted/in_progress comme dans bookings_pool_for_drivers. L''adresse exacte de prise en charge (et ses coordonnées) n''est exposée qu''à moins de 2h du pickup, ou dès in_progress/completed ; au-delà, la commune (pickup_municipality) est affichée à la place, pour limiter la fenêtre de contact direct hors plateforme sur les courses acceptées longtemps à l''avance (séries PMT notamment). Repose sur la policy RLS "bookings: driver pool view" déjà en place (driver_id = auth.uid() pour ces statuts), pas de SECURITY DEFINER nécessaire.';

-- ─── bookings_pool_for_drivers: un chauffeur suspendu (pool_suspended_until)
-- ne voit plus aucune course ─────────────────────────────────────────────────

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
  b.priority_expires_at
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
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT, medical notes, birth date) for driver consumption. Scoped to the calling driver''s own online status, vehicle/equipment compatibility, absence de suspension (pool_suspended_until), et (when configured) acceptance_radius_km around their parking position. Exposes distance_to_driver_km for sorting/display. Masque le téléphone patient et l''adresse exacte de prise en charge (commune affichée à la place, lat/lng à NULL) tant que la course n''est pas acceptée. Filtre/expose priority_driver_id/priority_expires_at : une séance de série reste prioritairement réservée au chauffeur ayant accepté la séance précédente avant de rouvrir au pool général.';
