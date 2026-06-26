-- =============================================================================
-- Mon Taxi Santé — Booking recovery by reference + phone
-- Patients book anonymously (see 003_anonymous_patient_booking.sql); their
-- access to "bookings: patient own" relies on the Supabase anonymous session
-- persisted in the browser. If that session is lost (cookies cleared,
-- private/incognito tab, different device), RLS blocks them from seeing
-- their own booking — there is no account to log back into.
--
-- This function lets a patient recover read access to ONE specific booking
-- if they supply both the exact booking UUID (the "reference" shown on the
-- confirmation page) AND the phone number used at booking time. Two-factor
-- enough to deter enumeration (the UUID space is not guessable), while
-- avoiding a full account system. Returns only display-safe columns — no
-- medical data (cpam_status, medical_notes, pmt_file_url, etc).
-- =============================================================================

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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT b.id, b.pickup_address, b.dropoff_address, b.pickup_datetime,
         b.return_datetime, b.vehicle_type, b.trip_type, b.estimated_price,
         b.status, b.created_at
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.patient_phone = p_phone;
$$;

COMMENT ON FUNCTION public.lookup_booking_by_reference IS
  'Recovers a single booking by UUID reference + phone when the anonymous browser session backing RLS access is lost. Returns display-safe columns only.';

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(UUID, TEXT) TO anon, authenticated;
