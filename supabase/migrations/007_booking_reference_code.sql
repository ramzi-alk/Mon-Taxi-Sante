-- =============================================================================
-- Mon Taxi Santé — Human-friendly booking reference code
-- The recovery flow (005, 006) used the raw UUID primary key as the
-- "reference" patients must type back in. UUIDs are unguessable but
-- impossible for a human to remember or retype reliably.
--
-- This adds a short, random, display-safe reference_code (8 characters,
-- restricted alphabet excluding 0/O/1/I to avoid misreads) generated
-- server-side at insert time. It carries NO personal information (name,
-- birth year, etc. were considered and rejected — see PR discussion: a
-- code derived from guessable personal data collapses the search space
-- and mirrors the well-known "PNR + surname" weakness in airline booking
-- lookups). The phone number is still required alongside it.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_booking_reference_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_alphabet TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; -- no 0/O/1/I
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(v_alphabet, (floor(random() * length(v_alphabet)) + 1)::int, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE reference_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reference_code TEXT;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.bookings WHERE reference_code IS NULL LOOP
    UPDATE public.bookings SET reference_code = public.generate_booking_reference_code() WHERE id = r.id;
  END LOOP;
END;
$$;

ALTER TABLE public.bookings ALTER COLUMN reference_code SET NOT NULL;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_reference_code_unique UNIQUE (reference_code);

CREATE OR REPLACE FUNCTION public.set_booking_reference_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.reference_code IS NULL THEN
    NEW.reference_code := public.generate_booking_reference_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_reference_code ON public.bookings;
CREATE TRIGGER bookings_set_reference_code
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_reference_code();

-- Rate-limit state must be re-keyed on the new public code (the UUID is no
-- longer the value an outside caller supplies).
DROP TABLE IF EXISTS public.booking_lookup_attempts;
CREATE TABLE public.booking_lookup_attempts (
  reference_code TEXT PRIMARY KEY,
  failed_count    INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_lookup_attempts IS
  'Internal throttling state for lookup_booking_by_reference, keyed by reference_code. Not exposed to anon/authenticated — only touched by the SECURITY DEFINER function.';

REVOKE ALL ON TABLE public.booking_lookup_attempts FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.lookup_booking_by_reference(UUID, TEXT);

CREATE FUNCTION public.lookup_booking_by_reference(
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
  SELECT locked_until INTO v_locked_until
  FROM public.booking_lookup_attempts
  WHERE reference_code = v_code;

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
    DELETE FROM public.booking_lookup_attempts WHERE reference_code = v_code;
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

COMMENT ON FUNCTION public.lookup_booking_by_reference IS
  'Recovers a single booking by its human-friendly reference_code + phone when the anonymous browser session backing RLS access is lost. Returns display-safe columns only. Locks out further attempts on a given reference_code for 15 minutes after 5 consecutive failed phone matches.';

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) TO anon, authenticated;
