-- =============================================================================
-- Mon Taxi Santé — Patient email for transactional notifications
--
-- Patients book anonymously (see 003_anonymous_patient_booking.sql) via a
-- Supabase anonymous session, so profiles.email is never populated for them.
-- There was therefore no email address anywhere in the booking flow, even
-- though the confirmation screen has always promised "vous recevrez une
-- confirmation par SMS et email". This adds the missing field directly on
-- the booking, captured once at submission time, so the app can actually
-- send the booking confirmation / cancellation emails (see Resend
-- integration in src/server/email.ts).
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN patient_email TEXT
    CHECK (patient_email IS NULL OR patient_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

COMMENT ON COLUMN public.bookings.patient_email IS
  'Email captured at booking time, used to send the confirmation/cancellation notifications. Nullable for bookings created before this column existed.';
