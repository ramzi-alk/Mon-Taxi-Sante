-- =============================================================================
-- Mon Taxi Santé — minimisation des données patient côté pool chauffeur +
-- priorité de série au même chauffeur
--
-- 1) Tant qu'une course n'est pas acceptée, le pool ne doit plus exposer :
--    - le numéro de téléphone du patient (recontact direct possible avant
--      tout engagement = risque de désintermédiation) ;
--    - l'adresse exacte de prise en charge (domicile privé du patient) —
--      seule la commune (pickup_municipality, capturée côté app via Mapbox
--      place_formatted) est affichée, et lat/lng sont masqués pour empêcher
--      tout pointage cartographique précis.
--    L'adresse d'arrivée (établissement de santé, lieu public) reste
--    inchangée. Une fois la course acceptée, bookings_active_for_driver
--    (migration 024) continue d'exposer les coordonnées complètes : le
--    chauffeur s'est alors engagé sur la course.
--
-- 2) Pour une série de soins (trip_type = multiple, plusieurs séances liées
--    par series_id, cf. migration 028), le chauffeur qui accepte une séance
--    se voit accorder une priorité temporaire (priority_driver_id /
--    priority_expires_at) sur les séances restantes de la même série, avant
--    qu'elles ne soient rouvertes au pool général. Fenêtre plafonnée à
--    12h et à 1h avant le pickup de chaque séance, pour ne jamais bloquer
--    une séance trop près de son heure réelle si le chauffeur ne confirme
--    pas.
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_municipality TEXT,
  ADD COLUMN IF NOT EXISTS priority_driver_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS priority_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.pickup_municipality IS
  'Commune/ville de prise en charge (place_formatted Mapbox), sans numéro/nom de rue. Affichée à la place de pickup_address dans le pool chauffeur tant que la course n''est pas acceptée.';
COMMENT ON COLUMN public.bookings.priority_driver_id IS
  'Chauffeur ayant accepté une autre séance de la même série (series_id) et bénéficiant d''un accès prioritaire temporaire à celle-ci avant réouverture au pool général. NULL hors fenêtre de priorité.';
COMMENT ON COLUMN public.bookings.priority_expires_at IS
  'Fin de la fenêtre de priorité accordée à priority_driver_id. Au-delà, la séance redevient visible par tous les chauffeurs compatibles.';

-- ─── update_booking(): transmet désormais pickup_municipality ──────────────

DROP FUNCTION IF EXISTS public.update_booking(
  UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION,
  TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN,
  SMALLINT, cpam_status, TEXT, TEXT, NUMERIC
);

CREATE FUNCTION public.update_booking(
  p_booking_id UUID,
  p_pickup_address TEXT,
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_dropoff_address TEXT,
  p_dropoff_lat DOUBLE PRECISION,
  p_dropoff_lng DOUBLE PRECISION,
  p_pickup_datetime TIMESTAMPTZ,
  p_return_datetime TIMESTAMPTZ,
  p_vehicle_type booking_vehicle_type,
  p_trip_type trip_type,
  p_requires_wheelchair BOOLEAN,
  p_requires_stretcher BOOLEAN,
  p_requires_oxygen BOOLEAN,
  p_passenger_count SMALLINT,
  p_cpam_status cpam_status,
  p_mutual_name TEXT,
  p_medical_notes TEXT,
  p_distance_km NUMERIC DEFAULT NULL,
  p_pickup_municipality TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status booking_status;
BEGIN
  SELECT status INTO v_status
  FROM public.bookings
  WHERE id = p_booking_id AND patient_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'booking_not_editable';
  END IF;

  UPDATE public.bookings
  SET
    pickup_address = p_pickup_address,
    pickup_lat = p_pickup_lat,
    pickup_lng = p_pickup_lng,
    pickup_municipality = p_pickup_municipality,
    dropoff_address = p_dropoff_address,
    dropoff_lat = p_dropoff_lat,
    dropoff_lng = p_dropoff_lng,
    distance_km = p_distance_km,
    pickup_datetime = p_pickup_datetime,
    return_datetime = p_return_datetime,
    vehicle_type = p_vehicle_type,
    trip_type = p_trip_type,
    requires_wheelchair = p_requires_wheelchair,
    requires_stretcher = p_requires_stretcher,
    requires_oxygen = p_requires_oxygen,
    passenger_count = p_passenger_count,
    cpam_status = p_cpam_status,
    mutual_name = p_mutual_name,
    medical_notes = p_medical_notes
  WHERE id = p_booking_id;
END;
$$;

COMMENT ON FUNCTION public.update_booking IS
  'Patient self-service edit of their own booking (date, time, addresses, vehicle, trip type, special needs, CPAM status, notes). Scoped to auth.uid()''s own booking; only allowed while still pending, i.e. before any confirmation or driver dispatch — past that point the app asks the patient to cancel and create a new reservation instead. p_distance_km est la distance routière réelle recalculée côté app (Mapbox Directions) au moment de la modification, NULL si indisponible (fallback Haversine du trigger). p_pickup_municipality maintient à jour le champ utilisé pour masquer l''adresse exacte dans le pool chauffeur.';

REVOKE ALL ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;

-- ─── update_booking_by_reference(): même ajout ─────────────────────────────

DROP FUNCTION IF EXISTS public.update_booking_by_reference(
  TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION,
  TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN,
  SMALLINT, cpam_status, TEXT, TEXT, NUMERIC
);

CREATE FUNCTION public.update_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT,
  p_pickup_address TEXT,
  p_pickup_lat DOUBLE PRECISION,
  p_pickup_lng DOUBLE PRECISION,
  p_dropoff_address TEXT,
  p_dropoff_lat DOUBLE PRECISION,
  p_dropoff_lng DOUBLE PRECISION,
  p_pickup_datetime TIMESTAMPTZ,
  p_return_datetime TIMESTAMPTZ,
  p_vehicle_type booking_vehicle_type,
  p_trip_type trip_type,
  p_requires_wheelchair BOOLEAN,
  p_requires_stretcher BOOLEAN,
  p_requires_oxygen BOOLEAN,
  p_passenger_count SMALLINT,
  p_cpam_status cpam_status,
  p_mutual_name TEXT,
  p_medical_notes TEXT,
  p_distance_km NUMERIC DEFAULT NULL,
  p_pickup_municipality TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(trim(p_reference_code));
  v_booking_id UUID;
  v_status booking_status;
BEGIN
  PERFORM public.assert_lookup_not_locked(v_code);

  SELECT id, status INTO v_booking_id, v_status
  FROM public.bookings
  WHERE reference_code = v_code AND patient_phone = p_phone;

  PERFORM public.record_lookup_result(v_code, v_booking_id IS NOT NULL);

  IF v_booking_id IS NULL THEN
    RETURN 'booking_not_found';
  END IF;

  IF v_status <> 'pending' THEN
    RETURN 'booking_not_editable';
  END IF;

  UPDATE public.bookings
  SET
    pickup_address = p_pickup_address,
    pickup_lat = p_pickup_lat,
    pickup_lng = p_pickup_lng,
    pickup_municipality = p_pickup_municipality,
    dropoff_address = p_dropoff_address,
    dropoff_lat = p_dropoff_lat,
    dropoff_lng = p_dropoff_lng,
    distance_km = p_distance_km,
    pickup_datetime = p_pickup_datetime,
    return_datetime = p_return_datetime,
    vehicle_type = p_vehicle_type,
    trip_type = p_trip_type,
    requires_wheelchair = p_requires_wheelchair,
    requires_stretcher = p_requires_stretcher,
    requires_oxygen = p_requires_oxygen,
    passenger_count = p_passenger_count,
    cpam_status = p_cpam_status,
    mutual_name = p_mutual_name,
    medical_notes = p_medical_notes
  WHERE id = v_booking_id;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.update_booking_by_reference IS
  'Patient self-service edit via the lost-session recovery flow. Scoped to a booking matching both reference_code and phone (same proof of ownership as lookup_booking_by_reference); only allowed while still pending. Returns a status string (ok / booking_not_found / booking_not_editable) rather than raising, so the rate-limit bookkeeping committed just before is never rolled back; still raises too_many_attempts when locked out, since that happens before any write. p_distance_km est la distance routière réelle recalculée côté app (Mapbox Directions) au moment de la modification, NULL si indisponible (fallback Haversine du trigger). p_pickup_municipality maintient à jour le champ utilisé pour masquer l''adresse exacte dans le pool chauffeur.';

REVOKE ALL ON FUNCTION public.update_booking_by_reference(TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking_by_reference(TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC, TEXT) TO anon, authenticated;

-- ─── get_my_bookings() / lookup_booking_by_reference(): exposent désormais
-- pickup_municipality (entre pickup_lng et dropoff_address). CREATE OR
-- REPLACE ne peut pas changer la liste de colonnes d'une fonction RETURNS
-- TABLE, d'où le DROP préalable (cf. migration 010/014/028).

DROP FUNCTION IF EXISTS public.get_my_bookings();

CREATE FUNCTION public.get_my_bookings()
RETURNS TABLE(
  id uuid, reference_code text, pickup_address text, pickup_lat double precision, pickup_lng double precision,
  pickup_municipality text,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision, pickup_datetime timestamptz,
  return_datetime timestamptz, vehicle_type booking_vehicle_type, trip_type trip_type, requires_wheelchair boolean,
  requires_stretcher boolean, requires_oxygen boolean, passenger_count smallint, estimated_price numeric,
  status booking_status, created_at timestamptz, patient_full_name text, patient_phone text, patient_email text,
  patient_birth_date date, cpam_status cpam_status, mutual_name text, medical_notes text,
  series_id uuid, series_index smallint, series_total smallint,
  driver_full_name text, driver_phone text, vehicle_brand text, vehicle_model text, vehicle_registration text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    b.id, b.reference_code, b.pickup_address, b.pickup_lat, b.pickup_lng,
    b.pickup_municipality,
    b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.requires_wheelchair,
    b.requires_stretcher, b.requires_oxygen, b.passenger_count,
    b.estimated_price, b.status, b.created_at, b.patient_full_name,
    b.patient_phone, b.patient_email, b.patient_birth_date,
    b.cpam_status, b.mutual_name, b.medical_notes,
    b.series_id, b.series_index, b.series_total,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.full_name END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.phone END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_brand END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_model END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_registration END
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  LEFT JOIN public.drivers_details dd ON dd.profile_id = b.driver_id
  WHERE b.patient_id = auth.uid()
  ORDER BY b.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_my_bookings() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated, anon;

COMMENT ON FUNCTION public.get_my_bookings() IS
  'Réservations de la session patiente courante (RLS via auth.uid()), avec infos chauffeur jointes une fois affecté et champs de série (series_id/series_index/series_total). Inclut pickup_municipality (commune de prise en charge).';

DROP FUNCTION IF EXISTS public.lookup_booking_by_reference(text, text);

CREATE FUNCTION public.lookup_booking_by_reference(p_reference_code text, p_phone text)
RETURNS TABLE(
  id uuid, reference_code text, pickup_address text, pickup_lat double precision, pickup_lng double precision,
  pickup_municipality text,
  dropoff_address text, dropoff_lat double precision, dropoff_lng double precision, pickup_datetime timestamptz,
  return_datetime timestamptz, vehicle_type booking_vehicle_type, trip_type trip_type, requires_wheelchair boolean,
  requires_stretcher boolean, requires_oxygen boolean, passenger_count smallint, estimated_price numeric,
  status booking_status, created_at timestamptz, patient_full_name text, patient_phone text, patient_email text,
  patient_birth_date date, cpam_status cpam_status, mutual_name text, medical_notes text,
  series_id uuid, series_index smallint, series_total smallint,
  driver_full_name text, driver_phone text, vehicle_brand text, vehicle_model text, vehicle_registration text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT := upper(trim(p_reference_code));
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT bla.locked_until INTO v_locked_until
  FROM public.booking_lookup_attempts bla
  WHERE bla.reference_code = v_code;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.reference_code, b.pickup_address, b.pickup_lat, b.pickup_lng,
    b.pickup_municipality,
    b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.requires_wheelchair,
    b.requires_stretcher, b.requires_oxygen, b.passenger_count,
    b.estimated_price, b.status, b.created_at, b.patient_full_name,
    b.patient_phone, b.patient_email, b.patient_birth_date,
    b.cpam_status, b.mutual_name, b.medical_notes,
    b.series_id, b.series_index, b.series_total,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.full_name END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.phone END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_brand END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_model END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_registration END
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  LEFT JOIN public.drivers_details dd ON dd.profile_id = b.driver_id
  WHERE b.reference_code = v_code
    AND b.patient_phone = p_phone;

  IF FOUND THEN
    DELETE FROM public.booking_lookup_attempts bla WHERE bla.reference_code = v_code;
  ELSE
    INSERT INTO public.booking_lookup_attempts (reference_code, failed_count, locked_until, updated_at)
    VALUES (v_code, 1, NULL, now())
    ON CONFLICT (reference_code) DO UPDATE
      SET failed_count = booking_lookup_attempts.failed_count + 1,
          updated_at = now(),
          locked_until = CASE
            WHEN booking_lookup_attempts.failed_count + 1 >= 5
              THEN now() + interval '15 minutes'
            ELSE NULL
          END;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(text, text) TO authenticated, anon;

COMMENT ON FUNCTION public.lookup_booking_by_reference(text, text) IS
  'Récupère une réservation par référence + téléphone pour la récupération sans session (cookies effacés, autre appareil). Rate-limitée via booking_lookup_attempts. Inclut les champs de série et pickup_municipality.';

-- ─── accept_ride(): vérifie la fenêtre de priorité de série, et la propage
-- aux autres séances disponibles de la même série une fois la course
-- acceptée ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_ride(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status              booking_status;
  v_vehicle_type        booking_vehicle_type;
  v_requires_wheelchair BOOLEAN;
  v_requires_stretcher  BOOLEAN;
  v_requires_oxygen     BOOLEAN;
  v_series_id           UUID;
  v_priority_driver_id  UUID;
  v_priority_expires_at TIMESTAMPTZ;
  v_driver_vehicle_type vehicle_type;
  v_pmr_equipped        BOOLEAN;
  v_stretcher_equipped  BOOLEAN;
  v_oxygen_equipped     BOOLEAN;
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

  SELECT vehicle_type, pmr_equipped, stretcher_equipped, oxygen_equipped
  INTO v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped
  FROM public.drivers_details
  WHERE profile_id = auth.uid();

  IF v_driver_vehicle_type IS NULL THEN
    RAISE EXCEPTION 'driver_profile_incomplete';
  END IF;

  IF NOT public.driver_matches_booking(
    v_vehicle_type, v_requires_wheelchair, v_requires_stretcher, v_requires_oxygen,
    v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped
  ) THEN
    RAISE EXCEPTION 'vehicle_not_compatible';
  END IF;

  UPDATE public.bookings
  SET driver_id = auth.uid(), status = 'accepted', priority_driver_id = NULL, priority_expires_at = NULL
  WHERE id = p_booking_id AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_already_taken';
  END IF;

  -- Priorité accordée aux autres séances encore disponibles de la même
  -- série : 12h max, et jamais au-delà d'1h avant le pickup de la séance
  -- concernée.
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
  'Acceptation d''une course par un chauffeur connecté, sous réserve de compatibilité véhicule/équipement (driver_matches_booking) et de l''éventuelle fenêtre de priorité de série (priority_driver_id/priority_expires_at) — un autre chauffeur ne peut pas accepter une séance encore réservée en priorité à celui qui a pris la séance précédente de la même série. Propage ensuite cette priorité aux séances restantes de la série.';

-- ─── bookings_pool_for_drivers: masque téléphone et adresse exacte de prise
-- en charge tant que la course n'est pas acceptée ; filtre/expose la
-- priorité de série ──────────────────────────────────────────────────────────

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
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT, medical notes, birth date) for driver consumption. Scoped to the calling driver''s own online status, vehicle/equipment compatibility, and (when configured) acceptance_radius_km around their parking position. Exposes distance_to_driver_km for sorting/display. Masque désormais le téléphone patient et l''adresse exacte de prise en charge (commune affichée à la place, lat/lng à NULL) tant que la course n''est pas acceptée — limite la désintermédiation avant tout engagement du chauffeur. Filtre/expose priority_driver_id/priority_expires_at : une séance de série reste prioritairement réservée au chauffeur ayant accepté la séance précédente avant de rouvrir au pool général.';
