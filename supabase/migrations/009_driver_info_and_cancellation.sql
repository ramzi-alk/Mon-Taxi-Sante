-- =============================================================================
-- Mon Taxi Santé — Driver info for patients, self-service cancellation
--
-- 1) get_my_bookings(): SECURITY DEFINER replacement for the plain
--    `bookings` table select used by the patient's "Mes réservations" page.
--    Joins driver display info (name, phone, vehicle) once a driver is
--    assigned. Patients have no direct RLS access to other users' rows in
--    `profiles`/`drivers_details`, so this function does the join on their
--    behalf, strictly scoped to auth.uid()'s own bookings.
--
-- 2) lookup_booking_by_reference is extended with the same driver columns,
--    for the lost-session recovery flow.
--
-- 3) cancel_booking(): the only way a patient can change their own booking's
--    status. The previous "bookings: patient own" policy was FOR ALL,
--    meaning a patient's browser session could, in principle, UPDATE or even
--    DELETE their own row directly via the REST API (e.g. set status to
--    'completed', or hijack driver_id) — nothing in the app did this, but
--    RLS allowed it. We replace it with SELECT + INSERT only; all patient
--    mutations now go through this narrowly-scoped function.
-- =============================================================================

-- ─── Realtime needs the full old row on UPDATE to detect a status change ──
-- (default REPLICA IDENTITY only ships the primary key in the old record)

ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- ─── Tighten patient RLS: SELECT + INSERT only, no direct UPDATE/DELETE ─────

DROP POLICY IF EXISTS "bookings: patient own" ON public.bookings;

CREATE POLICY "bookings: patient select"
  ON public.bookings FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "bookings: patient insert"
  ON public.bookings FOR INSERT
  WITH CHECK (patient_id = auth.uid() AND status = 'pending');

-- ─── get_my_bookings(): own bookings + driver info once assigned ───────────

CREATE FUNCTION public.get_my_bookings()
RETURNS TABLE (
  id                    UUID,
  reference_code        TEXT,
  pickup_address        TEXT,
  dropoff_address       TEXT,
  pickup_datetime       TIMESTAMPTZ,
  return_datetime       TIMESTAMPTZ,
  vehicle_type          booking_vehicle_type,
  trip_type             trip_type,
  estimated_price       NUMERIC(10,2),
  status                booking_status,
  created_at            TIMESTAMPTZ,
  patient_full_name     TEXT,
  cpam_status           cpam_status,
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
    b.id, b.reference_code, b.pickup_address, b.dropoff_address, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.estimated_price, b.status,
    b.created_at, b.patient_full_name, b.cpam_status,
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
  'Own bookings for the current session, with driver display info joined in once a driver is assigned. Replaces a direct table select so patients can see driver name/phone/vehicle despite having no RLS access to profiles/drivers_details rows that are not their own.';

REVOKE ALL ON FUNCTION public.get_my_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_bookings() TO authenticated;

-- ─── lookup_booking_by_reference: add the same driver + patient columns ───

DROP FUNCTION IF EXISTS public.lookup_booking_by_reference(TEXT, TEXT);

CREATE FUNCTION public.lookup_booking_by_reference(
  p_reference_code TEXT,
  p_phone TEXT
)
RETURNS TABLE (
  id                    UUID,
  reference_code        TEXT,
  pickup_address        TEXT,
  dropoff_address       TEXT,
  pickup_datetime       TIMESTAMPTZ,
  return_datetime       TIMESTAMPTZ,
  vehicle_type          booking_vehicle_type,
  trip_type             trip_type,
  estimated_price       NUMERIC(10,2),
  status                booking_status,
  created_at            TIMESTAMPTZ,
  patient_full_name     TEXT,
  cpam_status           cpam_status,
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
    b.id, b.reference_code, b.pickup_address, b.dropoff_address, b.pickup_datetime,
    b.return_datetime, b.vehicle_type, b.trip_type, b.estimated_price, b.status,
    b.created_at, b.patient_full_name, b.cpam_status,
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
  'Recovers a single booking by its human-friendly reference_code + phone when the anonymous browser session backing RLS access is lost. Returns display-safe columns only, including driver info once assigned. Locks out further attempts on a given reference_code for 15 minutes after 5 consecutive failed phone matches.';

REVOKE ALL ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_booking_by_reference(TEXT, TEXT) TO anon, authenticated;

-- ─── cancel_booking(): the only patient-facing status mutation ────────────

CREATE FUNCTION public.cancel_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
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

  IF v_status NOT IN ('pending', 'confirmed', 'available', 'accepted') THEN
    RAISE EXCEPTION 'booking_not_cancellable';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancellation_reason = p_reason
  WHERE id = p_booking_id;
END;
$$;

COMMENT ON FUNCTION public.cancel_booking IS
  'Patient self-service cancellation. Scoped to auth.uid()''s own booking; only allowed while the ride has not started (pending/confirmed/available/accepted). This is the only mutation path available to patients now that direct UPDATE on bookings has been revoked.';

REVOKE ALL ON FUNCTION public.cancel_booking(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking(UUID, TEXT) TO authenticated;
