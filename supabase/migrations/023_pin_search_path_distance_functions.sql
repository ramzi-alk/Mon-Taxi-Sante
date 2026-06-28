-- =============================================================================
-- Fixe search_path sur les fonctions ajoutées en migration 022, pour répondre
-- à l'avertissement "function_search_path_mutable" du linter Supabase. Sans
-- search_path fixe, un appelant pourrait altérer search_path dans sa session
-- pour faire résoudre un identifiant non qualifié vers un objet malveillant.
-- Toutes les références à des tables/fonctions sont déjà qualifiées
-- (public.xxx) dans ces fonctions ; seules les fonctions mathématiques
-- (sin, cos, asin, sqrt, radians, round, greatest) sont utilisées sans
-- préfixe, et elles vivent dans pg_catalog qui reste toujours résolu en
-- premier indépendamment de search_path.
-- =============================================================================

ALTER FUNCTION public.haversine_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION)
  SET search_path = '';

ALTER FUNCTION public.compute_booking_price(NUMERIC, booking_vehicle_type, trip_type, BOOLEAN)
  SET search_path = '';

ALTER FUNCTION public.bookings_set_distance_and_price()
  SET search_path = '';

ALTER FUNCTION public.get_my_driver_stats()
  SET search_path = '';
