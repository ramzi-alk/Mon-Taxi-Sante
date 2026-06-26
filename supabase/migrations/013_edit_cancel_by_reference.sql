-- =============================================================================
-- Mon Taxi Santé — Edit/cancel from the lost-session recovery flow
--
-- get_my_bookings()-backed cancel/edit (cancel_booking, update_booking) only
-- work for the live auth.uid() session. A patient who reaches their booking
-- via "Retrouver une réservation" (reference_code + phone, lost/cleared
-- session, different device) had a read-only card with no way to cancel or
-- correct it.
--
-- This adds two SECURITY DEFINER functions mirroring cancel_booking /
-- update_booking, but scoped by reference_code + phone instead of auth.uid()
-- — the exact same ownership proof already trusted by
-- lookup_booking_by_reference. They share its rate-limit state
-- (booking_lookup_attempts): a wrong phone guess against a given
-- reference_code counts against the same 5-attempts/15-minute lockout,
-- whichever of the three functions it came through.
--
-- cancel_booking_by_reference / update_booking_by_reference RETURN TEXT
-- instead of raising for the "not found" / "not cancellable" / "not
-- editable" cases (unlike cancel_booking / update_booking, which raise for
-- those since they have no rate-limit bookkeeping to protect). An uncaught
-- RAISE EXCEPTION aborts the whole enclosing transaction, which would also
-- roll back the record_lookup_result() write performed earlier in the same
-- call — silently defeating the brute-force lockout on phone-number
-- guesses against a known reference_code. Only the lockout check itself
-- (assert_lookup_not_locked) still raises, since it runs before any write.
-- =============================================================================

CREATE FUNCTION public.assert_lookup_not_locked(p_reference_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM public.booking_lookup_attempts
  WHERE reference_code = p_reference_code;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_lookup_not_locked IS
  'Shared rate-limit check for the reference_code + phone recovery flow (lookup/cancel/edit). Internal use only.';

REVOKE ALL ON FUNCTION public.assert_lookup_not_locked(TEXT) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_lookup_result(p_reference_code TEXT, p_found BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_found THEN
    DELETE FROM public.booking_lookup_attempts WHERE reference_code = p_reference_code;
  ELSE
    INSERT INTO public.booking_lookup_attempts (reference_code, failed_count, locked_until, updated_at)
    VALUES (p_reference_code, 1, NULL, now())
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

COMMENT ON FUNCTION public.record_lookup_result IS
  'Shared rate-limit bookkeeping for the reference_code + phone recovery flow (lookup/cancel/edit). Internal use only.';

REVOKE ALL ON FUNCTION public.record_lookup_result(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;

-- ─── cancel_booking_by_reference ───────────────────────────────────────────

CREATE FUNCTION public.cancel_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT,
  p_reason TEXT DEFAULT NULL
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

  IF v_status NOT IN ('pending', 'confirmed', 'available', 'accepted') THEN
    RETURN 'booking_not_cancellable';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancellation_reason = p_reason
  WHERE id = v_booking_id;

  RETURN 'ok';
END;
$$;

COMMENT ON FUNCTION public.cancel_booking_by_reference IS
  'Patient self-service cancellation via the lost-session recovery flow. Scoped to a booking matching both reference_code and phone (same proof of ownership as lookup_booking_by_reference); only allowed while the ride has not started. Returns a status string (ok / booking_not_found / booking_not_cancellable) rather than raising, so the rate-limit bookkeeping committed just before is never rolled back; still raises too_many_attempts when locked out, since that happens before any write.';

REVOKE ALL ON FUNCTION public.cancel_booking_by_reference(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_reference(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ─── update_booking_by_reference ───────────────────────────────────────────

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
  'Patient self-service edit via the lost-session recovery flow. Scoped to a booking matching both reference_code and phone (same proof of ownership as lookup_booking_by_reference); only allowed while still pending. Returns a status string (ok / booking_not_found / booking_not_editable) rather than raising, so the rate-limit bookkeeping committed just before is never rolled back; still raises too_many_attempts when locked out, since that happens before any write.';

REVOKE ALL ON FUNCTION public.update_booking_by_reference(TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_booking_by_reference(TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT) TO anon, authenticated;
