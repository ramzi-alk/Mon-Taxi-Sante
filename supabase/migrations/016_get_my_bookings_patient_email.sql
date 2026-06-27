-- =============================================================================
-- Mon Taxi Santé — Expose patient_email for rebooking pre-fill
--
-- patient_email was added in migration 015 but get_my_bookings() and
-- lookup_booking_by_reference() were never updated to return it, so the
-- "Réserver à nouveau avec ces informations" pre-fill (see
-- src/lib/bookingPrefill.ts) could never carry the email field forward.
-- Kept in sync between both functions as established in migration 010/014.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_my_bookings();

CREATE FUNCTION public.get_my_bookings()
RETURNS TABLE (
  id                    UUID,
  reference_code        TEXT,
  pickup_address        TEXT,
  pickup_lat            DOUBLE PRECISION,
  pickup_lng            DOUBLE PRECISION,
  dropoff_address       TEXT,
  dropoff_lat           DOUBLE PRECISION,
  dropoff_lng           DOUBLE PRECISION,
  pickup_datetime       TIMESTAMPTZ,
  return_datetime       TIMESTAMPTZ,
  vehicle_type          booking_vehicle_type,
  trip_type             trip_type,
  requires_wheelchair   BOOLEAN,
  requires_stretcher    BOOLEAN,
  requires_oxygen       BOOLEAN,
  passenger_count       SMALLINT,
  estimated_price       NUMERIC(10,2),
  status                booking_status,
  created_at            TIMESTAMPTZ,
  patient_full_name     TEXT,
  patient_phone         TEXT,
  patient_email         TEXT,
  patient_birth_date    DATE,
  cpam_status           cpam_status,
  mutual_name           TEXT,
  medical_notes         TEXT,
  driver_full_name      TEXT,
  driver_phone          TEXT,
  vehicle_brand         TEXT,
  vehicle_model         TEXT,
  vehicle_registration  TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.reference_code, b.pickup_address, b.pickup_lat, b.pickup_lng,
    b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.requires_wheelchair,
    b.requires_stretcher, b.requires_oxygen, b.passenger_count,
    b.estimated_price, b.status, b.created_at, b.patient_full_name,
    b.patient_phone, b.patient_email, b.patient_birth_date,
    b.cpam_status, b.mutual_name, b.medical_notes,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.full_name END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.phone END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_brand END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_model END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_registration END
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  LEFT JOIN public.drivers_details dd ON dd.profile_id = b.driver_id
  WHERE b.patient_id = auth.uid()
  ORDER BY b.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_my_bookings IS
  'Own bookings for the current session, with driver display info joined in once a driver is assigned, and the full set of editable trip fields (for the self-service edit form and the new-booking pre-fill).';

REVOKE ALL ON FUNCTION public.get_my_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated, anon;

-- ─── lookup_booking_by_reference: keep the same columns in sync ───────────

DROP FUNCTION IF EXISTS public.lookup_booking_by_reference(TEXT, TEXT);

CREATE FUNCTION public.lookup_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT
)
RETURNS TABLE (
  id                    UUID,
  reference_code        TEXT,
  pickup_address        TEXT,
  pickup_lat            DOUBLE PRECISION,
  pickup_lng            DOUBLE PRECISION,
  dropoff_address       TEXT,
  dropoff_lat           DOUBLE PRECISION,
  dropoff_lng           DOUBLE PRECISION,
  pickup_datetime       TIMESTAMPTZ,
  return_datetime       TIMESTAMPTZ,
  vehicle_type          booking_vehicle_type,
  trip_type             trip_type,
  requires_wheelchair   BOOLEAN,
  requires_stretcher    BOOLEAN,
  requires_oxygen       BOOLEAN,
  passenger_count       SMALLINT,
  estimated_price       NUMERIC(10,2),
  status                booking_status,
  created_at            TIMESTAMPTZ,
  patient_full_name     TEXT,
  patient_phone         TEXT,
  patient_email         TEXT,
  patient_birth_date    DATE,
  cpam_status           cpam_status,
  mutual_name           TEXT,
  medical_notes         TEXT,
  driver_full_name      TEXT,
  driver_phone          TEXT,
  vehicle_brand         TEXT,
  vehicle_model         TEXT,
  vehicle_registration  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := upper(trim(p_reference_code));
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT bla.locked_until INTO v_locked_until
  FROM public.booking_lookup_attempts bla
  WHERE bla.reference_code = v_code;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;

  RETURN QUERY
  SELECT
    b.id, b.reference_code, b.pickup_address, b.pickup_lat, b.pickup_lng,
    b.dropoff_address, b.dropoff_lat, b.dropoff_lng, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.requires_wheelchair,
    b.requires_stretcher, b.requires_oxygen, b.passenger_count,
    b.estimated_price, b.status, b.created_at, b.patient_full_name,
    b.patient_phone, b.patient_email, b.patient_birth_date,
    b.cpam_status, b.mutual_name, b.medical_notes,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.full_name END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN p.phone END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_brand END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_model END,
    CASE WHEN b.status IN ('accepted', 'in_progress', 'completed') THEN dd.vehicle_registration END
  FROM public.bookings b
  LEFT JOIN public.profiles p ON p.id = b.driver_id
  LEFT JOIN public.drivers_details dd ON dd.profile_id = b.driver_id
  WHERE b.reference_code = v_code
    AND b.patient_phone = p_phone;

  IF FOUND THEN
    DELETE FROM public.booking_lookup_attempts bla WHERE bla.reference_code = v_code;
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
  'Recovers a single booking by its human-friendly reference_code + phone when the anonymous browser session backing RLS access is lost. Returns display-safe columns only, including driver info once assigned, and the identity/trip fields needed to pre-fill a new booking. Locks out further attempts on a given reference_code for 15 minutes after 5 consecutive failed phone matches.';

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) TO anon, authenticated;
