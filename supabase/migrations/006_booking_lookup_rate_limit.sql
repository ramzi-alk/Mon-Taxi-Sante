-- =============================================================================
-- Mon Taxi Santé — Rate limiting for lookup_booking_by_reference
-- The recovery RPC (005) is SECURITY DEFINER and bypasses RLS by design,
-- relying on the caller knowing both the booking UUID (unguessable) and the
-- exact phone number used at booking time. Without throttling, anyone who
-- already holds a valid UUID (shared link, screenshot, shoulder-surfed
-- confirmation page) could brute-force the phone number against that one
-- row. This adds a per-booking attempt counter + lockout, enforced inside
-- the function itself — it holds even if a caller bypasses the app UI and
-- calls the RPC directly via the REST API.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.booking_lookup_attempts (
  booking_id    UUID PRIMARY KEY,
  failed_count  INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_lookup_attempts IS
  'Internal throttling state for lookup_booking_by_reference. Not exposed to anon/authenticated — only touched by the SECURITY DEFINER function.';

REVOKE ALL ON TABLE public.booking_lookup_attempts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_booking_by_reference(
  p_booking_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  id                UUID,
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
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM public.booking_lookup_attempts
  WHERE booking_id = p_booking_id;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;

  RETURN QUERY
  SELECT b.id, b.pickup_address, b.dropoff_address, b.pickup_datetime,
         b.return_datetime, b.vehicle_type, b.trip_type, b.estimated_price,
         b.status, b.created_at
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.patient_phone = p_phone;

  IF FOUND THEN
    DELETE FROM public.booking_lookup_attempts WHERE booking_id = p_booking_id;
  ELSE
    INSERT INTO public.booking_lookup_attempts (booking_id, failed_count, locked_until, updated_at)
    VALUES (p_booking_id, 1, NULL, now())
    ON CONFLICT (booking_id) DO UPDATE
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
  'Recovers a single booking by UUID reference + phone when the anonymous browser session backing RLS access is lost. Returns display-safe columns only. Locks out further attempts on a given booking_id for 15 minutes after 5 consecutive failed phone matches.';

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(UUID, TEXT) TO anon, authenticated;
