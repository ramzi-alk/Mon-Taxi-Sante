-- =============================================================================
-- Mon Taxi Santé — CA réel ajustable (Sprint 4)
--
-- Toutes les stats chauffeur (StatCard "Gains", get_my_driver_stats,
-- fetchDriverStatsSince) reposaient uniquement sur estimated_price, une
-- formule Haversine explicitement documentée comme "tarif réel légèrement
-- supérieur" (tooltip RideCard.tsx) — quasi inutilisable pour la compta
-- réelle d'un chauffeur indépendant. actual_price permet au chauffeur de
-- saisir le tarif réellement facturé après une course terminée, sans jamais
-- écraser estimated_price (qui reste l'estimation de départ, comparable
-- dans le temps).
-- =============================================================================

ALTER TABLE public.bookings
  ADD COLUMN actual_price NUMERIC(10,2) CHECK (actual_price IS NULL OR actual_price >= 0);

COMMENT ON COLUMN public.bookings.actual_price IS 'Tarif réellement facturé, saisi par le chauffeur après la course (set_actual_price). NULL tant que non saisi — estimated_price sert alors de repère. Ne remplace jamais estimated_price, qui reste l''estimation Haversine de départ.';

-- ─── set_actual_price(): chauffeur ajuste le tarif réel d'une course terminée

CREATE OR REPLACE FUNCTION public.set_actual_price(p_booking_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status booking_status;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT status INTO v_status
  FROM public.bookings
  WHERE id = p_booking_id AND driver_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'completed' THEN
    RAISE EXCEPTION 'booking_not_completed';
  END IF;

  UPDATE public.bookings SET actual_price = p_amount WHERE id = p_booking_id;
END;
$$;

COMMENT ON FUNCTION public.set_actual_price(UUID, NUMERIC) IS 'Le chauffeur connecté ajuste le tarif réellement facturé d''une de ses propres courses terminées. Modifiable plusieurs fois (correction d''une saisie).';

REVOKE ALL ON FUNCTION public.set_actual_price(UUID, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_actual_price(UUID, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_actual_price(UUID, NUMERIC) TO authenticated;

-- ─── bookings_active_for_driver: expose actual_price ────────────────────────

CREATE OR REPLACE VIEW public.bookings_active_for_driver
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  b.patient_full_name,
  b.patient_phone,
  CASE
    WHEN pickup_address_revealed(b.status, b.pickup_datetime) THEN b.pickup_address
    ELSE COALESCE(b.pickup_municipality, b.pickup_address)
  END AS pickup_address,
  CASE
    WHEN pickup_address_revealed(b.status, b.pickup_datetime) THEN b.pickup_lat
    ELSE NULL::double precision
  END AS pickup_lat,
  CASE
    WHEN pickup_address_revealed(b.status, b.pickup_datetime) THEN b.pickup_lng
    ELSE NULL::double precision
  END AS pickup_lng,
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
    WHEN (b.status = ANY (ARRAY['accepted'::booking_status, 'in_progress'::booking_status])) AND dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL THEN haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL::numeric
  END AS distance_to_driver_km,
  driver_br.rating AS driver_rating_given,
  patient_br.rating AS patient_rating_received,
  patient_average_rating(b.patient_id) AS patient_rating_avg,
  b.pmt_declared,
  b.is_hospitalization,
  b.series_index,
  b.series_total,
  b.series_id,
  b.actual_price
FROM bookings b
  JOIN drivers_details dd ON dd.profile_id = auth.uid()
  LEFT JOIN booking_ratings driver_br ON driver_br.booking_id = b.id AND driver_br.rater_role = 'driver'::booking_rating_role
  LEFT JOIN booking_ratings patient_br ON patient_br.booking_id = b.id AND patient_br.rater_role = 'patient'::booking_rating_role
WHERE b.driver_id = auth.uid() AND (b.status = ANY (ARRAY['accepted'::booking_status, 'in_progress'::booking_status, 'completed'::booking_status]));

COMMENT ON VIEW public.bookings_active_for_driver IS 'Courses actives/terminées du chauffeur connecté (accepted/in_progress/completed), avec adresse de prise en charge révélée progressivement et actual_price (Sprint 4 — tarif réel ajusté par le chauffeur, distinct d''estimated_price).';

-- ─── get_my_driver_stats(): CA réel quand disponible, estimation sinon ─────

CREATE OR REPLACE FUNCTION public.get_my_driver_stats()
RETURNS TABLE(rides_completed bigint, total_km numeric, total_earnings numeric, rides_today bigint, earnings_today numeric, average_rating numeric)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    count(*) FILTER (WHERE status = 'completed'),
    COALESCE(sum(distance_km) FILTER (WHERE status = 'completed'), 0),
    COALESCE(sum(COALESCE(actual_price, estimated_price)) FILTER (WHERE status = 'completed'), 0),
    count(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE),
    COALESCE(sum(COALESCE(actual_price, estimated_price)) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE), 0),
    public.driver_average_rating(auth.uid())
  FROM public.bookings
  WHERE driver_id = auth.uid();
$function$;

COMMENT ON FUNCTION public.get_my_driver_stats() IS 'Stats du chauffeur connecté pour le tableau de bord. Les gains utilisent actual_price quand le chauffeur l''a saisi (Sprint 4), estimated_price sinon.';
