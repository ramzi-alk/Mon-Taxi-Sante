-- =============================================================================
-- Mon Taxi Santé — signalements de lieu non identifiants (Sprint 4)
--
-- Étend le pattern déjà en production de patient_rating_avg (migration 035,
-- "infos non identifiantes exposées dans le pool pour aider la décision
-- d'acceptation") : un chauffeur ayant déjà desservi une adresse de prise en
-- charge peut y laisser une note factuelle ("étage sans ascenseur",
-- "stationnement difficile", "accès brancard compliqué"...) visible par les
-- autres chauffeurs — utile en particulier pour les patients en série
-- récurrente (dialyse, chimio), où la même adresse revient régulièrement.
--
-- Le pool ne révèle jamais l'adresse exacte de prise en charge avant
-- acceptation (migration 029/031) : il n'expose donc qu'un booléen
-- "signalée" (has_location_notes), jamais le contenu de la note. Le détail
-- textuel n'apparaît qu'une fois la course acceptée (bookings_active_for_driver),
-- moment où le chauffeur voit de toute façon l'adresse complète.
-- =============================================================================

CREATE TABLE public.booking_location_notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_address TEXT NOT NULL,
  note           TEXT NOT NULL CHECK (char_length(note) BETWEEN 1 AND 200),
  driver_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_location_notes IS 'Notes factuelles non identifiantes sur une adresse de prise en charge (accessibilité, stationnement...), laissées par un chauffeur ayant déjà desservi ce lieu — visibles par tous les chauffeurs une fois la course acceptée. Le pool n''expose qu''un booléen (has_location_notes), jamais le contenu, tant que l''adresse exacte reste masquée.';

CREATE INDEX idx_booking_location_notes_address ON public.booking_location_notes(pickup_address);

ALTER TABLE public.booking_location_notes ENABLE ROW LEVEL SECURITY;

-- Non identifiant par construction (adresse + texte libre modéré par la
-- limite de longueur, pas de nom de patient) : lisible par tout chauffeur,
-- pas seulement celui qui a desservi cette adresse.
CREATE POLICY "booking_location_notes: driver read all"
  ON public.booking_location_notes FOR SELECT
  USING (public.is_driver());

CREATE POLICY "booking_location_notes: admin all"
  ON public.booking_location_notes FOR ALL
  USING (public.is_admin());

-- ─── add_location_note(): chauffeur note le pickup d'une de ses courses ────

CREATE OR REPLACE FUNCTION public.add_location_note(p_booking_id UUID, p_note TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status         booking_status;
  v_pickup_address TEXT;
  v_note           TEXT;
BEGIN
  v_note := btrim(p_note);
  IF v_note = '' OR char_length(v_note) > 200 THEN
    RAISE EXCEPTION 'invalid_note';
  END IF;

  SELECT status, pickup_address INTO v_status, v_pickup_address
  FROM public.bookings
  WHERE id = p_booking_id AND driver_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status NOT IN ('accepted', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'booking_not_accepted';
  END IF;

  INSERT INTO public.booking_location_notes (pickup_address, note, driver_id)
  VALUES (v_pickup_address, v_note, auth.uid());
END;
$$;

COMMENT ON FUNCTION public.add_location_note(UUID, TEXT) IS 'Le chauffeur connecté ajoute une note sur le lieu de prise en charge d''une de ses courses (accepted/in_progress/completed uniquement — il faut avoir vu l''adresse réelle).';

REVOKE ALL ON FUNCTION public.add_location_note(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_location_note(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.add_location_note(UUID, TEXT) TO authenticated;

-- ─── get_location_notes(): notes existantes pour le pickup d'une course ────

CREATE OR REPLACE FUNCTION public.get_location_notes(p_booking_id UUID)
RETURNS TABLE (note TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ln.note, ln.created_at
  FROM public.booking_location_notes ln
  WHERE ln.pickup_address = (
    SELECT b.pickup_address FROM public.bookings b
    WHERE b.id = p_booking_id AND b.driver_id = auth.uid()
  )
  ORDER BY ln.created_at DESC
  LIMIT 20;
$$;

COMMENT ON FUNCTION public.get_location_notes(UUID) IS 'Notes de lieu existantes pour l''adresse de prise en charge d''une course du chauffeur connecté — scopé à ses propres courses (accepted/in_progress/completed) pour ne jamais révéler une adresse qu''il n''a pas déjà.';

REVOKE ALL ON FUNCTION public.get_location_notes(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_location_notes(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_location_notes(UUID) TO authenticated;

-- ─── bookings_pool_for_drivers: expose un simple booléen, jamais le contenu

CREATE OR REPLACE VIEW public.bookings_pool_for_drivers
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  split_part(b.patient_full_name, ' ', 1) AS patient_first_name,
  NULL::text AS patient_phone,
  COALESCE(b.pickup_municipality, b.pickup_address) AS pickup_address,
  NULL::double precision AS pickup_lat,
  NULL::double precision AS pickup_lng,
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
  b.created_at,
  CASE
    WHEN dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL
         AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL
    THEN public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL
  END AS distance_to_driver_km,
  b.priority_driver_id,
  b.priority_expires_at,
  public.patient_average_rating(b.patient_id) AS patient_rating_avg,
  b.pmt_declared,
  b.is_hospitalization,
  b.series_index,
  b.series_total,
  b.series_id,
  EXISTS (
    SELECT 1 FROM public.booking_location_notes ln WHERE ln.pickup_address = b.pickup_address
  ) AS has_location_notes
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
WHERE b.status = 'available'
  AND dd.availability = 'online'
  AND (dd.pool_suspended_until IS NULL OR dd.pool_suspended_until <= now())
  AND public.driver_matches_booking(
    b.vehicle_type, b.requires_wheelchair, b.requires_stretcher, b.requires_oxygen,
    dd.vehicle_type, dd.pmr_equipped, dd.stretcher_equipped, dd.oxygen_equipped
  )
  AND (
    dd.acceptance_radius_km IS NULL
    OR dd.parking_lat IS NULL OR dd.parking_lng IS NULL
    OR b.pickup_lat IS NULL OR b.pickup_lng IS NULL
    OR public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng) <= dd.acceptance_radius_km
  )
  AND (
    b.priority_driver_id IS NULL
    OR b.priority_driver_id = auth.uid()
    OR b.priority_expires_at IS NULL
    OR b.priority_expires_at <= now()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.booking_driver_refusals bdr
    WHERE bdr.booking_id = b.id AND bdr.driver_id = auth.uid()
  );

COMMENT ON VIEW public.bookings_pool_for_drivers IS 'RGPD/HDS-safe view: strips all health data. Expose désormais has_location_notes (migration 065) — un booléen indiquant qu''un ou plusieurs chauffeurs ont laissé une note sur ce lieu de prise en charge, sans jamais révéler le contenu ni l''adresse exacte avant acceptation.';
