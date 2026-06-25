-- =============================================================================
-- Mon Taxi Santé — Booking consent tracking
-- Records when the patient accepted the CGV / RGPD consent at booking time.
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN consent_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.consent_accepted_at IS
  'Timestamp at which the patient accepted the CGV and confidentiality policy. Required at submission time by the booking form.';
