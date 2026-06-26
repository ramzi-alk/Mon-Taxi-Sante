-- =============================================================================
-- Mon Taxi Santé — Lock down anon EXECUTE on auth.uid()-scoped functions
--
-- Supabase grants EXECUTE to anon/authenticated by default on newly created
-- functions (ALTER DEFAULT PRIVILEGES on the public schema). The
-- "REVOKE ALL ... FROM PUBLIC" pattern used in migrations 009/010 only
-- revokes the implicit PUBLIC privilege — it does not undo this separate
-- default grant made directly to the anon role. The Supabase security
-- advisor flagged get_my_bookings, cancel_booking and update_booking as
-- anon-executable as a result.
--
-- Not actually exploitable: auth.uid() is NULL for the anon role (no signed-in
-- session), so every `WHERE patient_id = auth.uid()` check inside these
-- functions matches zero rows. But these functions are meant to be called
-- only by a signed-in (including anonymous Supabase auth) session, so this
-- closes the gap explicitly rather than relying on that NULL-comparison
-- side effect.
--
-- lookup_booking_by_reference is intentionally left anon-executable — it is
-- the lost-session recovery flow, gated by reference_code + phone + rate
-- limiting instead of auth.uid().
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.get_my_bookings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT) FROM anon;
