-- Suite de la migration 047 (ajout du statut 'expired') :
--
-- 1. bookings_pool_for_drivers exclut désormais aussi les courses dont
--    pickup_datetime est déjà passé. C'est un filtre calculé, appliqué en
--    temps réel à chaque lecture du pool — il ne dépend pas du cron qui
--    bascule le statut en 'expired' (voir api/cron/expire-bookings), donc
--    une course dépassée disparaît immédiatement du pool des chauffeurs
--    même avant le prochain passage du cron.
-- 2. Un trigger notify_admin_booking_expired alimente le centre de
--    notifications admin (admin_notifications, migration 046) quand le cron
--    bascule effectivement une course en 'expired'.

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
  b.series_id
FROM public.bookings b
JOIN public.drivers_details dd ON dd.profile_id = auth.uid()
WHERE b.status = 'available'
  AND b.pickup_datetime > now()
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

COMMENT ON VIEW public.bookings_pool_for_drivers IS
  'RGPD/HDS-safe view: strips all health data (CPAM, PMT file, medical notes, birth date) for driver consumption — seuls pmt_declared/is_hospitalization (booléens, non identifiants) et series_id/series_index/series_total sont exposés pour aider le chauffeur à décider avant acceptation. Scoped to the calling driver''s own online status, vehicle/equipment compatibility, absence de suspension (pool_suspended_until), et (when configured) acceptance_radius_km around their parking position. Exposes distance_to_driver_km for sorting/display et patient_rating_avg (note moyenne du patient reçue des chauffeurs, façon note du passager affichée avant acceptation chez Uber). Filtre/expose priority_driver_id/priority_expires_at : une séance de série reste prioritairement réservée au chauffeur ayant accepté la séance précédente avant de rouvrir au pool général. Exclut les courses explicitement refusées par CE chauffeur (booking_driver_refusals, voir refuse_ride) — invisibles pour lui seul, toujours disponibles pour les autres chauffeurs compatibles. Exclut aussi (pour tous les chauffeurs) les courses dont pickup_datetime est déjà passé : filtre calculé en temps réel, indépendant du cron qui bascule le statut en ''expired'' (voir migration 048 et api/cron/expire-bookings).';

-- ─── notify_admin_booking_expired(): alimente le centre de notifications ───

CREATE OR REPLACE FUNCTION public.notify_admin_booking_expired()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'expired' AND OLD.status <> 'expired' THEN
    INSERT INTO public.admin_notifications (type, title, body, target_table, target_id)
    VALUES (
      'booking_expired',
      'Course expirée sans chauffeur — ' || NEW.reference_code,
      NEW.patient_full_name || ' — départ prévu le ' || to_char(NEW.pickup_datetime, 'DD/MM/YYYY à HH24:MI'),
      'bookings',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admin_booking_expired() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_admin_on_booking_expired
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_admin_booking_expired();
