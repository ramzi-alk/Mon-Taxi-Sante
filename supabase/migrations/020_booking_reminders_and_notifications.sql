-- =============================================================================
-- Mon Taxi Santé — Day-before reminder + double confirmation, post-acceptance
-- edit, driver self-unassignment
--
-- 1) Day-before reminder: a single-use, expiring, hashed-at-rest token (256
--    bits, generated server-side — see src/routes/api/cron/booking-reminders.ts)
--    lets the patient explicitly confirm or cancel from a dedicated page
--    (/confirmer-trajet). This is deliberately a *separate*, higher-entropy
--    proof of ownership than the existing reference_code + phone recovery
--    flow (migrations 005/009/013): it is the only factor, so no second
--    factor and no rate-limit are needed (infeasible to brute-force), but it
--    still gets single-use + expiration + hashing as defense-in-depth.
-- 2) update_booking() is widened to also allow editing while 'accepted' —
--    the live authenticated session already proves ownership, so this is
--    safe to extend. update_booking_by_reference() is deliberately left
--    untouched: that lower-entropy recovery flow must not be widened just to
--    keep the two edit paths symmetrical (same call made for the 'available'
--    window in migration 019).
-- 3) cancel_ride_by_driver(): a driver backing out of an 'accepted' ride
--    returns it to the pool (available, driver_id = NULL) instead of
--    cancelling the patient's reservation outright.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Reminder bookkeeping on bookings ──────────────────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN reminder_sent_at      TIMESTAMPTZ,
  ADD COLUMN reminder_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.reminder_sent_at IS
  'Set by the daily cron (api/cron/booking-reminders) once the day-before reminder email has been sent, so it is never sent twice.';
COMMENT ON COLUMN public.bookings.reminder_confirmed_at IS
  'Set when the patient explicitly confirms via the /confirmer-trajet page. Purely informational — does not change status.';

-- ─── booking_reminder_tokens: internal-only, mirrors booking_lookup_attempts ─

CREATE TABLE public.booking_reminder_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  response    TEXT CHECK (response IN ('confirmed', 'cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_booking_reminder_tokens_booking ON public.booking_reminder_tokens(booking_id);

COMMENT ON TABLE public.booking_reminder_tokens IS
  'Single-use day-before reminder tokens. token_hash stores sha256(token) only — the raw token is never persisted, only emailed. Never accessed outside SECURITY DEFINER functions, same as booking_lookup_attempts (migration 006).';

REVOKE ALL ON TABLE public.booking_reminder_tokens FROM PUBLIC, anon, authenticated;

-- ─── resolve_reminder_token(): read-only lookup for /confirmer-trajet ──────

CREATE FUNCTION public.resolve_reminder_token(p_token TEXT)
RETURNS TABLE (
  booking_id      UUID,
  reference_code  TEXT,
  pickup_address  TEXT,
  dropoff_address TEXT,
  pickup_datetime TIMESTAMPTZ,
  status          booking_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT := encode(digest(p_token, 'sha256'), 'hex');
BEGIN
  RETURN QUERY
  SELECT b.id, b.reference_code, b.pickup_address, b.dropoff_address, b.pickup_datetime, b.status
  FROM public.booking_reminder_tokens t
  JOIN public.bookings b ON b.id = t.booking_id
  WHERE t.token_hash = v_hash
    AND t.used_at IS NULL
    AND t.expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_invalid';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.resolve_reminder_token IS
  'Read-only resolution of a day-before reminder token for the /confirmer-trajet page. Raises token_invalid if the token does not exist, was already used, or has expired.';

REVOKE ALL ON FUNCTION public.resolve_reminder_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_reminder_token(TEXT) TO anon, authenticated;

-- ─── confirm_reminder(): patient explicitly confirms, nothing changes ─────

CREATE FUNCTION public.confirm_reminder(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT := encode(digest(p_token, 'sha256'), 'hex');
  v_token_id UUID;
  v_booking_id UUID;
BEGIN
  SELECT id, booking_id INTO v_token_id, v_booking_id
  FROM public.booking_reminder_tokens
  WHERE token_hash = v_hash AND used_at IS NULL AND expires_at > now();

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'token_invalid';
  END IF;

  UPDATE public.booking_reminder_tokens
  SET used_at = now(), response = 'confirmed'
  WHERE id = v_token_id;

  UPDATE public.bookings
  SET reminder_confirmed_at = now()
  WHERE id = v_booking_id;
END;
$$;

COMMENT ON FUNCTION public.confirm_reminder IS
  'Patient explicit confirmation from /confirmer-trajet: marks the token used and stamps reminder_confirmed_at. Does not touch booking status.';

REVOKE ALL ON FUNCTION public.confirm_reminder(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_reminder(TEXT) TO anon, authenticated;

-- ─── cancel_via_reminder(): patient explicit cancellation, returns booking_id ─

CREATE FUNCTION public.cancel_via_reminder(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT := encode(digest(p_token, 'sha256'), 'hex');
  v_token_id UUID;
  v_booking_id UUID;
  v_status booking_status;
BEGIN
  SELECT id, booking_id INTO v_token_id, v_booking_id
  FROM public.booking_reminder_tokens
  WHERE token_hash = v_hash AND used_at IS NULL AND expires_at > now();

  IF v_token_id IS NULL THEN
    RAISE EXCEPTION 'token_invalid';
  END IF;

  SELECT status INTO v_status FROM public.bookings WHERE id = v_booking_id;

  IF v_status NOT IN ('pending', 'confirmed', 'available', 'accepted') THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancellation_reason = 'Annulée par le patient (rappel)'
  WHERE id = v_booking_id;

  UPDATE public.booking_reminder_tokens
  SET used_at = now(), response = 'cancelled'
  WHERE id = v_token_id;

  RETURN v_booking_id;
END;
$$;

COMMENT ON FUNCTION public.cancel_via_reminder IS
  'Patient explicit cancellation from /confirmer-trajet (double-confirmation step already happened client-side). Same cancellable statuses as cancel_booking. Returns booking_id so the caller can trigger notifyBookingCancelledServerFn, which also emails the assigned driver if any (see notifyBookingCancelledServerFn).';

REVOKE ALL ON FUNCTION public.cancel_via_reminder(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_via_reminder(TEXT) TO anon, authenticated;

-- ─── update_booking(): widen the editable window to include 'accepted' ────
-- The caller is the real authenticated patient session (auth.uid()), so
-- unlike update_booking_by_reference this can safely be widened. The app is
-- responsible for notifying the driver of the change (see
-- notifyBookingUpdatedServerFn) since this function does not know the email.

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

  IF v_status NOT IN ('pending', 'available', 'accepted') THEN
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
  'Patient self-service edit of their own booking (date, time, addresses, vehicle, trip type, special needs, CPAM status, notes). Scoped to auth.uid()''s own booking; allowed while pending, available, or accepted — widened in migration 020 to cover edits after a driver has accepted, on the condition the app notifies that driver (see notifyBookingUpdatedServerFn). update_booking_by_reference is deliberately NOT widened: that lower-entropy recovery flow keeps the original pending/available-only window.';

-- ─── cancel_ride_by_driver(): accepted -> available, driver_id cleared ─────

CREATE FUNCTION public.cancel_ride_by_driver(p_booking_id UUID)
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
  WHERE id = p_booking_id AND driver_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'accepted' THEN
    RAISE EXCEPTION 'booking_not_cancellable_by_driver';
  END IF;

  UPDATE public.bookings
  SET status = 'available', driver_id = NULL
  WHERE id = p_booking_id;
END;
$$;

COMMENT ON FUNCTION public.cancel_ride_by_driver IS
  'Driver backs out of their own accepted ride. Returns it to the pool (available, driver_id cleared) rather than cancelling the patient''s reservation. Scoped to driver_id = auth.uid(); only allowed from accepted. The app is responsible for notifying the patient (see notifyRideUnassignedServerFn).';

REVOKE ALL ON FUNCTION public.cancel_ride_by_driver(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_ride_by_driver(UUID) TO authenticated;
