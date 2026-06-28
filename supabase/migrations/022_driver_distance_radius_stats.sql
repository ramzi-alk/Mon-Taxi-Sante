-- =============================================================================
-- Mon Taxi Santé — Distance automatique, rayon d'acceptation, stats chauffeur
--
-- 1) distance_km restait toujours NULL (jamais calculé) : un trigger calcule
--    désormais la distance pickup -> dropoff (Haversine) à chaque
--    insertion/mise à jour d'adresse, et en déduit estimated_price avec la
--    même formule tarifaire CPAM que src/lib/pricing.ts (calculateCpamPrice).
-- 2) Le chauffeur peut renseigner la position de sa commune de stationnement
--    (parking_lat/lng, résolus via l'API BAN comme parking_municipality) et
--    un rayon d'acceptation optionnel : la pool ne lui montre alors que les
--    courses dont le point de départ est dans ce rayon.
-- 3) get_my_driver_stats() expose les stats du chauffeur connecté (courses
--    terminées, km et gains, total et du jour) pour le tableau de bord.
-- =============================================================================

-- ─── Position et rayon d'acceptation du chauffeur ──────────────────────────

ALTER TABLE public.drivers_details
  ADD COLUMN parking_lat DOUBLE PRECISION,
  ADD COLUMN parking_lng DOUBLE PRECISION,
  ADD COLUMN acceptance_radius_km NUMERIC(6,2);

COMMENT ON COLUMN public.drivers_details.parking_lat IS
  'Latitude de la commune de stationnement, résolue via l''API BAN.';
COMMENT ON COLUMN public.drivers_details.parking_lng IS
  'Longitude de la commune de stationnement, résolue via l''API BAN.';
COMMENT ON COLUMN public.drivers_details.acceptance_radius_km IS
  'Rayon (km) au-delà duquel une course n''apparaît plus dans le pool du chauffeur. NULL = aucune limite.';

-- ─── haversine_km(): distance à vol d'oiseau entre deux points ────────────

CREATE FUNCTION public.haversine_km(
  p_lat1 DOUBLE PRECISION, p_lng1 DOUBLE PRECISION,
  p_lat2 DOUBLE PRECISION, p_lng2 DOUBLE PRECISION
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(
    (
      2 * 6371 * asin(
        sqrt(
          sin(radians(p_lat2 - p_lat1) / 2) ^ 2
          + cos(radians(p_lat1)) * cos(radians(p_lat2))
            * sin(radians(p_lng2 - p_lng1) / 2) ^ 2
        )
      )
    )::numeric,
    2
  );
$$;

COMMENT ON FUNCTION public.haversine_km IS
  'Distance à vol d''oiseau (km) entre deux points lat/lng (formule de Haversine, rayon terrestre 6371 km).';

REVOKE ALL ON FUNCTION public.haversine_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haversine_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated, anon;

-- ─── compute_booking_price(): même formule que calculateCpamPrice().total ─

CREATE FUNCTION public.compute_booking_price(
  p_distance_km         NUMERIC,
  p_vehicle_type        booking_vehicle_type,
  p_trip_type           trip_type,
  p_requires_wheelchair BOOLEAN
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base_fare     NUMERIC;
  v_per_km        NUMERIC;
  v_pmr_supplement NUMERIC;
  v_min_fare      NUMERIC;
  v_subtotal      NUMERIC;
  v_return_discount NUMERIC;
  v_total         NUMERIC;
BEGIN
  CASE p_vehicle_type
    WHEN 'taxi' THEN v_base_fare := 2.6;  v_per_km := 1.21; v_pmr_supplement := 3.0; v_min_fare := 7.3;
    WHEN 'vsl'  THEN v_base_fare := 0;    v_per_km := 0.95; v_pmr_supplement := 0;   v_min_fare := 10.0;
    WHEN 'pmr'  THEN v_base_fare := 2.6;  v_per_km := 1.21; v_pmr_supplement := 5.0; v_min_fare := 10.0;
  END CASE;

  v_subtotal := v_base_fare + p_distance_km * v_per_km
    + (CASE WHEN p_requires_wheelchair THEN v_pmr_supplement ELSE 0 END);
  v_subtotal := GREATEST(v_subtotal, v_min_fare);

  v_return_discount := CASE WHEN p_trip_type = 'aller_retour' THEN v_subtotal * 0.1 ELSE 0 END;
  v_total := GREATEST(v_subtotal - v_return_discount, v_min_fare);

  RETURN ROUND(v_total, 2);
END;
$$;

COMMENT ON FUNCTION public.compute_booking_price IS
  'Porte la formule tarifaire CPAM de src/lib/pricing.ts (calculateCpamPrice().total) en SQL, pour calculer estimated_price dès que la distance est connue.';

REVOKE ALL ON FUNCTION public.compute_booking_price(NUMERIC, booking_vehicle_type, trip_type, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_booking_price(NUMERIC, booking_vehicle_type, trip_type, BOOLEAN) TO authenticated, anon;

-- ─── Trigger: distance_km + estimated_price automatiques ──────────────────

CREATE FUNCTION public.bookings_set_distance_and_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL
     AND NEW.dropoff_lat IS NOT NULL AND NEW.dropoff_lng IS NOT NULL THEN
    NEW.distance_km := public.haversine_km(NEW.pickup_lat, NEW.pickup_lng, NEW.dropoff_lat, NEW.dropoff_lng);
    NEW.estimated_price := public.compute_booking_price(
      NEW.distance_km, NEW.vehicle_type, NEW.trip_type, NEW.requires_wheelchair
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bookings_set_distance_and_price IS
  'Recalcule distance_km (Haversine) et estimated_price (tarif CPAM) dès que les adresses ou le profil de la course changent. distance_km n''est donc plus jamais NULL une fois les deux adresses géocodées.';

CREATE TRIGGER bookings_distance_and_price
  BEFORE INSERT OR UPDATE OF pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type, trip_type, requires_wheelchair
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_set_distance_and_price();

-- Pas de backfill global ici : une UPDATE réévalue TOUTES les contraintes
-- CHECK de la ligne (dont pickup_datetime > now()), donc une course de
-- démo déjà passée ferait échouer toute la transaction. Le trigger suffit
-- pour les nouvelles courses ; un backfill ciblé (pickup_datetime > now())
-- peut être lancé séparément si besoin.

-- ─── Pool: distance au chauffeur + filtre par rayon d'acceptation ─────────

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
  b.created_at,
  CASE
    WHEN dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL
         AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL
    THEN public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL
  END AS distance_to_driver_km
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
WHERE b.status = 'available'
  AND dd.availability = 'online'
  AND public.driver_matches_booking(
    b.vehicle_type, b.requires_wheelchair, b.requires_stretcher, b.requires_oxygen,
    dd.vehicle_type, dd.pmr_equipped, dd.stretcher_equipped, dd.oxygen_equipped
  )
  AND (
    dd.acceptance_radius_km IS NULL
    OR dd.parking_lat IS NULL OR dd.parking_lng IS NULL
    OR b.pickup_lat IS NULL OR b.pickup_lng IS NULL
    OR public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng) <= dd.acceptance_radius_km
  );

COMMENT ON VIEW public.bookings_pool_for_drivers IS
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT, medical notes, birth date) for driver consumption. Scoped to the calling driver''s own online status, vehicle/equipment compatibility, and (when configured) acceptance_radius_km around their parking position. Exposes distance_to_driver_km for sorting/display.';

-- ─── get_my_driver_stats(): stats du chauffeur connecté ───────────────────
-- Pas de SECURITY DEFINER : la policy "bookings: driver pool view" autorise
-- déjà un chauffeur à lire ses propres lignes accepted/in_progress/completed.

CREATE FUNCTION public.get_my_driver_stats()
RETURNS TABLE (
  rides_completed BIGINT,
  total_km        NUMERIC,
  total_earnings  NUMERIC,
  rides_today     BIGINT,
  earnings_today  NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*) FILTER (WHERE status = 'completed'),
    COALESCE(sum(distance_km) FILTER (WHERE status = 'completed'), 0),
    COALESCE(sum(estimated_price) FILTER (WHERE status = 'completed'), 0),
    count(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE),
    COALESCE(sum(estimated_price) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE), 0)
  FROM public.bookings
  WHERE driver_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_driver_stats IS
  'Stats du chauffeur connecté (courses terminées, km et gains cumulés + du jour) pour le tableau de bord. Pas de SECURITY DEFINER : repose sur la policy RLS existante qui restreint déjà bookings aux lignes du chauffeur.';

REVOKE ALL ON FUNCTION public.get_my_driver_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_driver_stats() TO authenticated;
