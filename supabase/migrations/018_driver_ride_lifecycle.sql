-- =============================================================================
-- Mon Taxi Santé — Driver ride lifecycle, online status, vehicle compatibility
--
-- Sprint 1 of the driver-app roadmap (see ROADMAP-CHAUFFEUR.md):
--   1) Status transitions after acceptance: accepted -> in_progress ->
--      completed, each exposed as a SECURITY DEFINER RPC (same pattern as
--      cancel_booking/update_booking) so a driver can only move their own
--      ride forward one step at a time.
--   2) Driver online/paused/offline status on drivers_details, so the pool
--      is only shown to drivers who are actually available right now.
--   3) Vehicle/equipment compatibility is enforced as a hard block instead
--      of a cosmetic badge: a driver only ever sees — and can only accept —
--      rides their vehicle is actually equipped for (taxi/vsl/pmr, plus
--      wheelchair/stretcher/oxygen). Acceptance moves from a direct table
--      UPDATE to an accept_ride() RPC that re-checks compatibility
--      server-side, closing the gap where a driver could otherwise accept
--      an incompatible ride and cancel on-site.
-- =============================================================================

-- ─── New equipment columns, mirroring the existing pmr_equipped column ────

ALTER TABLE public.drivers_details
  ADD COLUMN stretcher_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN oxygen_equipped    BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.drivers_details.stretcher_equipped IS
  'TRUE if vehicle is equipped to carry a patient on a stretcher.';
COMMENT ON COLUMN public.drivers_details.oxygen_equipped IS
  'TRUE if vehicle carries onboard oxygen equipment.';

-- ─── Driver availability (online / paused / offline) ──────────────────────

CREATE TYPE driver_availability AS ENUM ('online', 'paused', 'offline');

ALTER TABLE public.drivers_details
  ADD COLUMN availability             driver_availability NOT NULL DEFAULT 'offline',
  ADD COLUMN availability_changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.drivers_details.availability IS
  'Driver-controlled toggle: online = sees the ride pool, paused/offline = does not. Defaults to offline so a newly approved driver opts in explicitly.';

-- Already covered by "drivers: own read/write" (FOR ALL, profile_id = auth.uid()) —
-- no RLS change needed for a driver to update their own availability.

-- ─── Ride timestamps for the new lifecycle steps ──────────────────────────

ALTER TABLE public.bookings
  ADD COLUMN picked_up_at TIMESTAMPTZ,
  ADD COLUMN completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.picked_up_at IS
  'Set when the driver starts the ride (status -> in_progress).';
COMMENT ON COLUMN public.bookings.completed_at IS
  'Set when the driver completes the ride (status -> completed).';

-- ─── driver_matches_booking(): shared compatibility rule ──────────────────
-- taxi requires a taxi vehicle; vsl requires a vsl or ambulance vehicle;
-- pmr requires a wheelchair-equipped vehicle regardless of base type.
-- Independently, any required equipment (wheelchair/stretcher/oxygen) must
-- be present on the vehicle.

CREATE FUNCTION public.driver_matches_booking(
  p_booking_vehicle_type  booking_vehicle_type,
  p_requires_wheelchair   BOOLEAN,
  p_requires_stretcher    BOOLEAN,
  p_requires_oxygen       BOOLEAN,
  p_driver_vehicle_type   vehicle_type,
  p_pmr_equipped          BOOLEAN,
  p_stretcher_equipped    BOOLEAN,
  p_oxygen_equipped       BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE p_booking_vehicle_type
      WHEN 'taxi' THEN p_driver_vehicle_type = 'taxi'
      WHEN 'vsl'  THEN p_driver_vehicle_type IN ('vsl', 'ambulance')
      WHEN 'pmr'  THEN p_pmr_equipped
    END
    AND (NOT p_requires_wheelchair OR p_pmr_equipped)
    AND (NOT p_requires_stretcher OR p_stretcher_equipped)
    AND (NOT p_requires_oxygen OR p_oxygen_equipped);
$$;

COMMENT ON FUNCTION public.driver_matches_booking IS
  'Shared compatibility rule between a booking''s vehicle/equipment requirements and a driver''s actual vehicle/equipment. Used both to filter the ride pool view and to hard-block accept_ride() server-side.';

REVOKE ALL ON FUNCTION public.driver_matches_booking(
  booking_vehicle_type, BOOLEAN, BOOLEAN, BOOLEAN, vehicle_type, BOOLEAN, BOOLEAN, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.driver_matches_booking(
  booking_vehicle_type, BOOLEAN, BOOLEAN, BOOLEAN, vehicle_type, BOOLEAN, BOOLEAN, BOOLEAN
) TO authenticated;

-- ─── Tighten driver RLS: drop the old direct-UPDATE accept policy ─────────
-- Acceptance now goes exclusively through accept_ride() below, which
-- re-checks compatibility server-side — mirrors the patient-side hardening
-- in migration 009 (cancel/update only via SECURITY DEFINER functions).

DROP POLICY IF EXISTS "bookings: driver accept" ON public.bookings;

-- ─── accept_ride(): replaces the direct UPDATE used by the pool "Accepter" ─

CREATE FUNCTION public.accept_ride(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status              booking_status;
  v_vehicle_type        booking_vehicle_type;
  v_requires_wheelchair BOOLEAN;
  v_requires_stretcher  BOOLEAN;
  v_requires_oxygen     BOOLEAN;
  v_driver_vehicle_type vehicle_type;
  v_pmr_equipped        BOOLEAN;
  v_stretcher_equipped  BOOLEAN;
  v_oxygen_equipped     BOOLEAN;
BEGIN
  IF NOT public.is_driver() THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  SELECT status, vehicle_type, requires_wheelchair, requires_stretcher, requires_oxygen
  INTO v_status, v_vehicle_type, v_requires_wheelchair, v_requires_stretcher, v_requires_oxygen
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'booking_not_available';
  END IF;

  SELECT vehicle_type, pmr_equipped, stretcher_equipped, oxygen_equipped
  INTO v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped
  FROM public.drivers_details
  WHERE profile_id = auth.uid();

  IF v_driver_vehicle_type IS NULL THEN
    RAISE EXCEPTION 'driver_profile_incomplete';
  END IF;

  IF NOT public.driver_matches_booking(
    v_vehicle_type, v_requires_wheelchair, v_requires_stretcher, v_requires_oxygen,
    v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped
  ) THEN
    RAISE EXCEPTION 'vehicle_not_compatible';
  END IF;

  UPDATE public.bookings
  SET driver_id = auth.uid(), status = 'accepted'
  WHERE id = p_booking_id AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_already_taken';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.accept_ride IS
  'Driver acceptance of a pool ride. Re-checks vehicle/equipment compatibility server-side (driver_matches_booking) so a driver cannot accept a ride their vehicle is not equipped for, even by calling the API directly. Uses the same available-status optimistic lock as the previous direct UPDATE.';

REVOKE ALL ON FUNCTION public.accept_ride(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_ride(UUID) TO authenticated;

-- ─── start_ride(): accepted -> in_progress ─────────────────────────────────

CREATE FUNCTION public.start_ride(p_booking_id UUID)
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
    RAISE EXCEPTION 'booking_not_startable';
  END IF;

  UPDATE public.bookings
  SET status = 'in_progress', picked_up_at = now()
  WHERE id = p_booking_id;
END;
$$;

COMMENT ON FUNCTION public.start_ride IS
  'Driver marks their own accepted ride as started (in_progress) and stamps picked_up_at. Scoped to driver_id = auth.uid(); only allowed from accepted.';

REVOKE ALL ON FUNCTION public.start_ride(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_ride(UUID) TO authenticated;

-- ─── complete_ride(): in_progress -> completed ─────────────────────────────

CREATE FUNCTION public.complete_ride(p_booking_id UUID)
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

  IF v_status <> 'in_progress' THEN
    RAISE EXCEPTION 'booking_not_completable';
  END IF;

  UPDATE public.bookings
  SET status = 'completed', completed_at = now()
  WHERE id = p_booking_id;
END;
$$;

COMMENT ON FUNCTION public.complete_ride IS
  'Driver marks their own in_progress ride as completed and stamps completed_at. Scoped to driver_id = auth.uid(); only allowed from in_progress.';

REVOKE ALL ON FUNCTION public.complete_ride(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_ride(UUID) TO authenticated;

-- ─── bookings_pool_for_drivers: scope to the caller's own compatibility ───
-- Same column shape as before; the pool now also requires the calling
-- driver to be online and vehicle/equipment-compatible with each row.

CREATE OR REPLACE VIEW public.bookings_pool_for_drivers
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  split_part(b.patient_full_name, ' ', 1) AS patient_first_name,
  b.patient_phone,
  b.pickup_address,
  b.pickup_lat,
  b.pickup_lng,
  b.dropoff_address,
  b.dropoff_lat,
  b.dropoff_lng,
  b.distance_km,
  b.pickup_datetime,
  b.return_datetime,
  b.vehicle_type,
  b.trip_type,
  b.requires_wheelchair,
  b.requires_stretcher,
  b.requires_oxygen,
  b.passenger_count,
  b.estimated_price,
  b.status,
  b.created_at
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
WHERE b.status = 'available'
  AND dd.availability = 'online'
  AND public.driver_matches_booking(
    b.vehicle_type, b.requires_wheelchair, b.requires_stretcher, b.requires_oxygen,
    dd.vehicle_type, dd.pmr_equipped, dd.stretcher_equipped, dd.oxygen_equipped
  );

COMMENT ON VIEW public.bookings_pool_for_drivers IS
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT, medical notes, birth date) for driver consumption. Also scoped to the calling driver''s own online status and vehicle/equipment compatibility — a driver only ever sees rides they are actually available and equipped to take.';
