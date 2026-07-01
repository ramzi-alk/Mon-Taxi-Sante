-- =============================================================================
-- Fix: reminder token functions always failed, reported to patients as an
-- "expired" link.
--
-- resolve_reminder_token / confirm_reminder / cancel_via_reminder (migration
-- 020) call digest() from pgcrypto, but on this project pgcrypto is installed
-- in the `extensions` schema (Supabase default), not `public`. Since these
-- functions do `SET search_path = public`, digest() was never resolvable and
-- every call raised "function digest(text, unknown) does not exist" — a
-- generic error the frontend surfaces as "Ce lien de confirmation n'est plus
-- valide", indistinguishable from a real expiration. Widening search_path to
-- include `extensions` fixes resolution without touching token/expiration
-- logic itself.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resolve_reminder_token(p_token TEXT)
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
SET search_path = public, extensions
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

CREATE OR REPLACE FUNCTION public.confirm_reminder(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

CREATE OR REPLACE FUNCTION public.cancel_via_reminder(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
