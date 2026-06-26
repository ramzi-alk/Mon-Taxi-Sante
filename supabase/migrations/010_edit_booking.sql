-- =============================================================================
-- Mon Taxi Santé — Patient self-service edit of a pending booking
--
-- update_booking(): lets a patient correct their own request — date, time,
-- pickup/dropoff address, vehicle, trip type, special needs, CPAM status,
-- notes — while it is still `pending`, i.e. before any confirmation or
-- driver dispatch has started. Scoped to auth.uid()'s own booking, same
-- SECURITY DEFINER pattern as cancel_booking().
--
-- Once the booking has moved past `pending`, update_booking raises
-- `booking_not_editable`; the app then guides the patient to cancel and
-- create a new reservation instead — at that point a change is no longer
-- a small correction but a different request, and confirmation/driver
-- matching has already started acting on the original one.
--
-- get_my_bookings() and lookup_booking_by_reference are extended with the
-- extra columns (coordinates, special needs, passenger count, mutuelle,
-- notes) the edit form needs to pre-fill, kept in sync with each other as
-- already established in migration 009.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_my_bookings();

CREATE FUNCTION public.get_my_bookings()
RETURNS TABLE (
  id                    UUID,
  reference_code        TEXT,
  pickup_address        TEXT,
  pickup_lat            DOUBLE PRECISION,
  pickup_lng            DOUBLE PRECISION,
  dropoff_address       TEXT,
  dropoff_lat           DOUBLE PRECISION,
  dropoff_lng           DOUBLE PRECISION,
  pickup_datetime       TIMESTAMPTZ,
  return_datetime       TIMESTAMPTZ,
  vehicle_type          booking_vehicle_type,
  trip_type             trip_type,
  requires_wheelchair   BOOLEAN,
  requires_stretcher    BOOLEAN,
  requires_oxygen       BOOLEAN,
  passenger_count       SMALLINT,
  estimated_price       NUMERIC(10,2),
  status                booking_status,
  created_at            TIMESTAMPTZ,
  patient_full_name     TEXT,
  cpam_status           cpam_status,
  mutual_name           TEXT,
  medical_notes         TEXT,
  driver_full_name      TEXT,
  driver_phone          TEXT,
  vehicle_brand         TEXT,
  vehicle_model         TEXT,
  vehicle_registration  TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.reference_code, b.pickup_address, b.pickup_lat, b.pickup_lng,
    b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.requires_wheelchair,
    b.requires_stretcher, b.requires_oxygen, b.passenger_count,
    b.estimated_price, b.status, b.created_at, b.patient_full_name,
    b.cpam_status, b.mutual_name, b.medical_notes,
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
$$;

COMMENT ON FUNCTION public.get_my_bookings IS
  'Own bookings for the current session, with driver display info joined in once a driver is assigned, and the full set of editable trip fields (for the self-service edit form). Replaces a direct table select so patients can see/edit data despite having no RLS access to profiles/drivers_details rows that are not their own.';

REVOKE ALL ON FUNCTION public.get_my_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated;

-- ─── lookup_booking_by_reference: keep the same columns in sync ───────────

DROP FUNCTION IF EXISTS public.lookup_booking_by_reference(TEXT, TEXT);

CREATE FUNCTION public.lookup_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT
)
RETURNS TABLE (
  id                    UUID,
  reference_code        TEXT,
  pickup_address        TEXT,
  pickup_lat            DOUBLE PRECISION,
  pickup_lng            DOUBLE PRECISION,
  dropoff_address       TEXT,
  dropoff_lat           DOUBLE PRECISION,
  dropoff_lng           DOUBLE PRECISION,
  pickup_datetime       TIMESTAMPTZ,
  return_datetime       TIMESTAMPTZ,
  vehicle_type          booking_vehicle_type,
  trip_type             trip_type,
  requires_wheelchair   BOOLEAN,
  requires_stretcher    BOOLEAN,
  requires_oxygen       BOOLEAN,
  passenger_count       SMALLINT,
  estimated_price       NUMERIC(10,2),
  status                booking_status,
  created_at            TIMESTAMPTZ,
  patient_full_name     TEXT,
  cpam_status           cpam_status,
  mutual_name           TEXT,
  medical_notes         TEXT,
  driver_full_name      TEXT,
  driver_phone          TEXT,
  vehicle_brand         TEXT,
  vehicle_model         TEXT,
  vehicle_registration  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.requires_wheelchair,
    b.requires_stretcher, b.requires_oxygen, b.passenger_count,
    b.estimated_price, b.status, b.created_at, b.patient_full_name,
    b.cpam_status, b.mutual_name, b.medical_notes,
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
$$;

COMMENT ON FUNCTION public.lookup_booking_by_reference IS
  'Recovers a single booking by its human-friendly reference_code + phone when the anonymous browser session backing RLS access is lost. Returns display-safe columns only, including driver info once assigned. Locks out further attempts on a given reference_code for 15 minutes after 5 consecutive failed phone matches.';

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) TO anon, authenticated;

-- ─── update_booking(): patient self-service edit while still pending ─────

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
  p_medical_notes TEXT
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
  'Patient self-service edit of their own booking (date, time, addresses, vehicle, trip type, special needs, CPAM status, notes). Scoped to auth.uid()''s own booking; only allowed while still pending, i.e. before any confirmation or driver dispatch — past that point the app asks the patient to cancel and create a new reservation instead.';

REVOKE ALL ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT) TO authenticated;
