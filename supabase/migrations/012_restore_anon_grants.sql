-- =============================================================================
-- Mon Taxi Santé — Revert 011: restore anon EXECUTE on get_my_bookings,
-- cancel_booking and update_booking
--
-- Bug: migration 011 revoked anon's EXECUTE to close a security-advisor
-- finding. But "Mes réservations" calls get_my_bookings() on every page
-- load, including for a visitor who has no anonymous-auth session yet
-- (first visit, cleared storage, different browser/device). Before 011,
-- that call ran as the anon role and returned zero rows (auth.uid() is
-- NULL for anon), which the page renders as the normal empty state.
-- After 011, the same call now hard-fails with
-- "permission denied for function get_my_bookings", breaking the page
-- for every sessionless visitor — not just patients who already have
-- bookings.
--
-- This is safe to restore: auth.uid() is NULL for the anon role, so
-- get_my_bookings() still returns zero rows, and cancel_booking /
-- update_booking still raise booking_not_found instead of touching any
-- row that belongs to another patient — already verified directly via
-- `SET ROLE anon; SELECT auth.uid();` (NULL) before 011 was applied. No
-- cross-patient data exposure is reintroduced.
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.update_booking(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TIMESTAMPTZ, TIMESTAMPTZ, booking_vehicle_type, trip_type, BOOLEAN, BOOLEAN, BOOLEAN, SMALLINT, cpam_status, TEXT, TEXT) TO anon;
