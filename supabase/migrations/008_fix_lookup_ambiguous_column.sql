-- =============================================================================
-- Fix: lookup_booking_by_reference raised "column reference reference_code
-- is ambiguous". The function's RETURNS TABLE clause declares a
-- `reference_code` OUT parameter, which shadows the
-- booking_lookup_attempts.reference_code column in unqualified WHERE/DELETE
-- clauses. Qualify the table references to resolve it.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.lookup_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT
)
RETURNS TABLE (
  id                UUID,
  reference_code    TEXT,
  pickup_address    TEXT,
  dropoff_address   TEXT,
  pickup_datetime   TIMESTAMPTZ,
  return_datetime   TIMESTAMPTZ,
  vehicle_type      booking_vehicle_type,
  trip_type         trip_type,
  estimated_price   NUMERIC(10,2),
  status            booking_status,
  created_at        TIMESTAMPTZ
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
  SELECT b.id, b.reference_code, b.pickup_address, b.dropoff_address, b.pickup_datetime,
         b.return_datetime, b.vehicle_type, b.trip_type, b.estimated_price,
         b.status, b.created_at
  FROM public.bookings b
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

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) TO anon, authenticated;
