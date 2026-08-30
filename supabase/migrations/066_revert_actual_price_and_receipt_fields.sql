-- =============================================================================
-- Mon Taxi Santé — retrait du CA réel ajustable et du justificatif PDF (Sprint 4)
--
-- Ces deux tickets (migrations 063 et 064) sont abandonnés avant merge sur
-- main : le tarif réel ajustable par le chauffeur (actual_price) et
-- l'exposition de picked_up_at/completed_at/reference_code côté chauffeur
-- (qui ne servaient qu'au justificatif PDF) sont retirés. Restaure
-- bookings_active_for_driver et get_my_driver_stats() dans l'état où les
-- avait laissés la migration 039/033 — dernier état stable avant 063.
-- =============================================================================

-- CREATE OR REPLACE VIEW ne peut qu'ajouter des colonnes (jamais en
-- retirer, ERROR 42P16) — il faut DROP puis CREATE pour retirer
-- actual_price/picked_up_at/completed_at/reference_code. Les privilèges par
-- défaut de Supabase sur le schéma public (anon/authenticated/service_role)
-- se réappliquent automatiquement à la recréation, comme pour toute nouvelle
-- vue de ce schéma.
DROP VIEW IF EXISTS public.bookings_active_for_driver;

CREATE VIEW public.bookings_active_for_driver
WITH (security_invoker = TRUE)
AS
SELECT
  b.id,
  b.driver_id,
  b.patient_full_name,
  b.patient_phone,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_address
    ELSE COALESCE(b.pickup_municipality, b.pickup_address)
  END AS pickup_address,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_lat
    ELSE NULL
  END AS pickup_lat,
  CASE
    WHEN public.pickup_address_revealed(b.status, b.pickup_datetime)
    THEN b.pickup_lng
    ELSE NULL
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
    WHEN b.status IN ('accepted', 'in_progress')
         AND dd.parking_lat IS NOT NULL AND dd.parking_lng IS NOT NULL
         AND b.pickup_lat IS NOT NULL AND b.pickup_lng IS NOT NULL
    THEN public.haversine_km(dd.parking_lat, dd.parking_lng, b.pickup_lat, b.pickup_lng)
    ELSE NULL
  END AS distance_to_driver_km,
  driver_br.rating AS driver_rating_given,
  patient_br.rating AS patient_rating_received,
  public.patient_average_rating(b.patient_id) AS patient_rating_avg,
  b.pmt_declared,
  b.is_hospitalization,
  b.series_index,
  b.series_total,
  b.series_id
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
LEFT JOIN public.booking_ratings driver_br ON driver_br.booking_id = b.id AND driver_br.rater_role = 'driver'
LEFT JOIN public.booking_ratings patient_br ON patient_br.booking_id = b.id AND patient_br.rater_role = 'patient'
WHERE b.driver_id = auth.uid()
  AND b.status IN ('accepted', 'in_progress', 'completed');

COMMENT ON VIEW public.bookings_active_for_driver IS 'Courses acceptées/en cours/terminées du chauffeur connecté (équivalent de fetchDriverRides), avec distance_to_driver_km, driver_rating_given et patient_rating_received. L''adresse exacte de prise en charge reste masquée hors fenêtre de révélation (voir pickup_address_revealed, migration 031).';

-- ─── get_my_driver_stats(): retour à estimated_price uniquement ────────────

CREATE OR REPLACE FUNCTION public.get_my_driver_stats()
RETURNS TABLE (
  rides_completed BIGINT,
  total_km        NUMERIC,
  total_earnings  NUMERIC,
  rides_today     BIGINT,
  earnings_today  NUMERIC,
  average_rating  NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(*) FILTER (WHERE status = 'completed'),
    COALESCE(sum(distance_km) FILTER (WHERE status = 'completed'), 0),
    COALESCE(sum(estimated_price) FILTER (WHERE status = 'completed'), 0),
    count(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE),
    COALESCE(sum(estimated_price) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE), 0),
    public.driver_average_rating(auth.uid())
  FROM public.bookings
  WHERE driver_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_driver_stats IS
  'Stats du chauffeur connecté (courses terminées, km et gains cumulés + du jour, note moyenne reçue des patients) pour le tableau de bord. Pas de SECURITY DEFINER : repose sur la policy RLS existante qui restreint déjà bookings aux lignes du chauffeur.';

-- ─── Retrait de set_actual_price() et de la colonne actual_price ───────────

DROP FUNCTION IF EXISTS public.set_actual_price(UUID, NUMERIC);

ALTER TABLE public.bookings DROP COLUMN IF EXISTS actual_price;
