-- =============================================================================
-- Mon Taxi Santé — Auto-publish new bookings to the driver pool
--
-- New bookings are inserted with status = 'pending' (the only value the
-- "bookings: patient insert" RLS policy allows, see migration 009). Nothing
-- ever moved them to 'available' afterwards — the status
-- bookings_pool_for_drivers filters on (migration 018) — because that step
-- was meant to go through an admin confirmation screen that was never built.
-- Result: every reservation sat in 'pending' forever and never reached a
-- single driver.
--
-- Until/unless a manual admin review step is added, auto-publish instead:
-- publish_booking() flips the caller's own 'pending' booking straight to
-- 'available', right after insertBooking succeeds (called once from
-- submitBookingServerFn).
--
-- Patients could previously only self-edit (update_booking /
-- update_booking_by_reference) while 'pending'. Since bookings now leave
-- 'pending' almost immediately, the edit window is extended through
-- 'available' too — still "before any driver has been dispatched", which is
-- the actual intent of that restriction.
-- =============================================================================

-- ─── publish_booking(): pending -> available, owner-scoped ────────────────

CREATE FUNCTION public.publish_booking(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET status = 'available'
  WHERE id = p_booking_id AND patient_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_publishable';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.publish_booking IS
  'Flips the caller''s own pending booking to available (driver pool) right after creation. Stand-in for a manual admin confirmation step that does not exist yet.';

REVOKE ALL ON FUNCTION public.publish_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_booking(UUID) TO authenticated;

-- ─── update_booking(): editable while pending OR available ────────────────

CREATE OR REPLACE FUNCTION public.update_booking(
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

  IF v_status NOT IN ('pending', 'available') THEN
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
  'Patient self-service edit of their own booking (date, time, addresses, vehicle, trip type, special needs, CPAM status, notes). Scoped to auth.uid()''s own booking; only allowed while pending or available, i.e. before a driver has accepted — past that point the app asks the patient to cancel and create a new reservation instead.';

-- ─── update_booking_by_reference(): same widened editing window ───────────

CREATE OR REPLACE FUNCTION public.update_booking_by_reference(
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
  p_medical_notes TEXT
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

  IF v_status NOT IN ('pending', 'available') THEN
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
  'Patient self-service edit via the lost-session recovery flow. Scoped to a booking matching both reference_code and phone (same proof of ownership as lookup_booking_by_reference); only allowed while pending or available. Returns a status string (ok / booking_not_found / booking_not_editable) rather than raising, so the rate-limit bookkeeping committed just before is never rolled back; still raises too_many_attempts when locked out, since that happens before any write.';
