-- =============================================================================
-- Mon Taxi Santé — distance routière réelle via Mapbox Directions
--
-- distance_km était calculé exclusivement en base via haversine_km() (vol
-- d'oiseau, jamais la distance réelle sur route). L'app calcule désormais
-- elle-même la distance routière côté client (Mapbox Directions, voir
-- src/lib/mapbox.ts) et la transmet à l'insertion/modification de la
-- réservation ; le trigger ne recalcule plus la distance que si l'app n'en a
-- fourni aucune (API Mapbox indisponible), au lieu de l'écraser
-- systématiquement.
-- =============================================================================

-- ─── Trigger: distance_km fournie par l'app prioritaire sur le fallback Haversine ─
-- (reprend la version 8-args de compute_booking_price introduite en migration
-- 026 — seul le calcul de distance_km change ici, le reste du corps est
-- identique à la version actuelle du trigger.)

CREATE OR REPLACE FUNCTION public.bookings_set_distance_and_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.distance_km IS NULL
     AND NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL
     AND NEW.dropoff_lat IS NOT NULL AND NEW.dropoff_lng IS NOT NULL THEN
    NEW.distance_km := public.haversine_km(
      NEW.pickup_lat, NEW.pickup_lng,
      NEW.dropoff_lat, NEW.dropoff_lng
    );
  END IF;

  IF NEW.distance_km IS NOT NULL THEN
    NEW.estimated_price := public.compute_booking_price(
      NEW.distance_km,
      NEW.vehicle_type,
      NEW.trip_type,
      NEW.requires_wheelchair,
      NEW.pickup_datetime,
      NEW.is_hospitalization,
      NEW.pickup_address,
      NEW.dropoff_address
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.bookings_set_distance_and_price() SET search_path = '';

COMMENT ON FUNCTION public.bookings_set_distance_and_price IS
  'Recalcule estimated_price (tarif convention 2025) dès que les adresses ou le profil de la course changent. distance_km est désormais fourni par l''app (distance routière réelle via Mapbox Directions, voir src/lib/mapbox.ts) ; le fallback Haversine ne s''applique que si l''app n''a pas pu fournir de distance.';

-- ─── update_booking(): distance_km fraîchement recalculée transmise par l'app ─

DROP FUNCTION IF EXISTS public.update_booking(
  UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION,
  TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN,
  SMALLINT, cpam_status, TEXT, TEXT
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
  p_distance_km NUMERIC DEFAULT NULL
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
  'Patient self-service edit of their own booking (date, time, addresses, vehicle, trip type, special needs, CPAM status, notes). Scoped to auth.uid()''s own booking; only allowed while still pending, i.e. before any confirmation or driver dispatch — past that point the app asks the patient to cancel and create a new reservation instead. p_distance_km est la distance routière réelle recalculée côté app (Mapbox Directions) au moment de la modification, NULL si indisponible (fallback Haversine du trigger).';

REVOKE ALL ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC) TO authenticated;

-- ─── update_booking_by_reference(): même ajout ────────────────────────────

DROP FUNCTION IF EXISTS public.update_booking_by_reference(
  TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION,
  TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN,
  SMALLINT, cpam_status, TEXT, TEXT
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
  p_distance_km NUMERIC DEFAULT NULL
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
  'Patient self-service edit via the lost-session recovery flow. Scoped to a booking matching both reference_code and phone (same proof of ownership as lookup_booking_by_reference); only allowed while still pending. Returns a status string (ok / booking_not_found / booking_not_editable) rather than raising, so the rate-limit bookkeeping committed just before is never rolled back; still raises too_many_attempts when locked out, since that happens before any write. p_distance_km est la distance routière réelle recalculée côté app (Mapbox Directions) au moment de la modification, NULL si indisponible (fallback Haversine du trigger).';

REVOKE ALL ON FUNCTION public.update_booking_by_reference(TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking_by_reference(TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT, NUMERIC) TO anon, authenticated;
