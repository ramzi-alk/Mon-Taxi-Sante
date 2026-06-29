-- =============================================================================
-- 036 — Book a ride on behalf of another person
-- Adds booker contact columns used when a family member, caregiver, or helper
-- places the reservation on behalf of the patient.
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN booking_for_other BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN booker_full_name  TEXT,
  ADD COLUMN booker_phone      TEXT,
  ADD COLUMN booker_email      TEXT;

COMMENT ON COLUMN public.bookings.booking_for_other IS
  'TRUE when the booking was placed on behalf of another person (proche, aidant, parent).';
COMMENT ON COLUMN public.bookings.booker_full_name IS
  'Full name of the person who placed the booking (when booking_for_other = TRUE).';
COMMENT ON COLUMN public.bookings.booker_phone IS
  'Phone number of the booker — secondary contact for the driver when booking_for_other = TRUE.';
COMMENT ON COLUMN public.bookings.booker_email IS
  'Email of the booker — receives the confirmation email when booking_for_other = TRUE.';
