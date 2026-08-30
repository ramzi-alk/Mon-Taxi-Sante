-- =============================================================================
-- Mon Taxi Santé — détection de chevauchement d'horaires à l'acceptation
--
-- accept_ride() ne vérifiait jusqu'ici que la compatibilité véhicule/équipement,
-- l'éventuelle fenêtre de priorité de série (migration 029) et la suspension
-- de pool (migration 030) — jamais si le chauffeur avait déjà une autre
-- course acceptée à un horaire incompatible. Un chauffeur pouvait donc
-- accepter deux courses se chevauchant (ex. 14h00 à un endroit et 14h15 à
-- 20 km) : en transport sanitaire (patient attendu pour une dialyse, une
-- chimio…), un retard/rendez-vous manqué a des conséquences bien plus graves
-- que dans du VTC classique.
--
-- On ajoute un garde-fou volontairement prudent plutôt qu'un calcul
-- d'itinéraire réel (pas de service de routing serveur à ce stade) : chaque
-- course occupe une fenêtre estimée [pickup_datetime, busy_end], où busy_end
-- part du pickup (ou du retour pour un aller-retour) et ajoute une durée
-- estimée à ~2 min/km (plancher 20 min, pour couvrir prise en charge/dépose
-- sur les trajets courts). Deux courses du même chauffeur ne doivent pas se
-- chevaucher une fois ces fenêtres élargies d'une marge de battement de
-- 20 minutes. Nouvelle erreur : 'schedule_conflict'.
--
-- Reprend intégralement le corps de la version migration 030 (suspension de
-- pool, accepted_at) — ne pas régresser dessus dans une future révision.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_ride(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status               booking_status;
  v_vehicle_type         booking_vehicle_type;
  v_requires_wheelchair  BOOLEAN;
  v_requires_stretcher   BOOLEAN;
  v_requires_oxygen      BOOLEAN;
  v_series_id            UUID;
  v_priority_driver_id   UUID;
  v_priority_expires_at  TIMESTAMPTZ;
  v_pickup_datetime      TIMESTAMPTZ;
  v_return_datetime      TIMESTAMPTZ;
  v_distance_km          NUMERIC;
  v_busy_end             TIMESTAMPTZ;
  v_driver_vehicle_type  vehicle_type;
  v_pmr_equipped         BOOLEAN;
  v_stretcher_equipped   BOOLEAN;
  v_oxygen_equipped      BOOLEAN;
  v_pool_suspended_until TIMESTAMPTZ;
  v_has_conflict         BOOLEAN;
BEGIN
  IF NOT public.is_driver() THEN
    RAISE EXCEPTION 'not_a_driver';
  END IF;

  SELECT status, vehicle_type, requires_wheelchair, requires_stretcher, requires_oxygen,
         series_id, priority_driver_id, priority_expires_at,
         pickup_datetime, return_datetime, distance_km
  INTO v_status, v_vehicle_type, v_requires_wheelchair, v_requires_stretcher, v_requires_oxygen,
       v_series_id, v_priority_driver_id, v_priority_expires_at,
       v_pickup_datetime, v_return_datetime, v_distance_km
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'booking_not_available';
  END IF;

  IF v_priority_driver_id IS NOT NULL
     AND v_priority_driver_id <> auth.uid()
     AND v_priority_expires_at IS NOT NULL
     AND v_priority_expires_at > now() THEN
    RAISE EXCEPTION 'booking_priority_reserved';
  END IF;

  SELECT vehicle_type, pmr_equipped, stretcher_equipped, oxygen_equipped, pool_suspended_until
  INTO v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped, v_pool_suspended_until
  FROM public.drivers_details
  WHERE profile_id = auth.uid();

  IF v_driver_vehicle_type IS NULL THEN
    RAISE EXCEPTION 'driver_profile_incomplete';
  END IF;

  IF v_pool_suspended_until IS NOT NULL AND v_pool_suspended_until > now() THEN
    RAISE EXCEPTION 'driver_pool_suspended';
  END IF;

  IF NOT public.driver_matches_booking(
    v_vehicle_type, v_requires_wheelchair, v_requires_stretcher, v_requires_oxygen,
    v_driver_vehicle_type, v_pmr_equipped, v_stretcher_equipped, v_oxygen_equipped
  ) THEN
    RAISE EXCEPTION 'vehicle_not_compatible';
  END IF;

  v_busy_end := GREATEST(v_pickup_datetime, COALESCE(v_return_datetime, v_pickup_datetime))
    + (GREATEST(20, CEIL(COALESCE(v_distance_km, 0) * 2)) || ' minutes')::interval;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.driver_id = auth.uid()
      AND b.status IN ('accepted', 'in_progress')
      AND b.id <> p_booking_id
      AND b.pickup_datetime < v_busy_end + interval '20 minutes'
      AND v_pickup_datetime < (
        GREATEST(b.pickup_datetime, COALESCE(b.return_datetime, b.pickup_datetime))
        + (GREATEST(20, CEIL(COALESCE(b.distance_km, 0) * 2)) || ' minutes')::interval
        + interval '20 minutes'
      )
  ) INTO v_has_conflict;

  IF v_has_conflict THEN
    RAISE EXCEPTION 'schedule_conflict';
  END IF;

  UPDATE public.bookings
  SET driver_id = auth.uid(), status = 'accepted', accepted_at = now(),
      priority_driver_id = NULL, priority_expires_at = NULL
  WHERE id = p_booking_id AND status = 'available';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_already_taken';
  END IF;

  -- Priorité accordée aux autres séances encore disponibles de la même
  -- série : 12h max, et jamais au-delà d'1h avant le pickup de la séance
  -- concernée.
  IF v_series_id IS NOT NULL THEN
    UPDATE public.bookings
    SET priority_driver_id = auth.uid(),
        priority_expires_at = LEAST(now() + interval '12 hours', pickup_datetime - interval '1 hour')
    WHERE series_id = v_series_id
      AND id <> p_booking_id
      AND status = 'available';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.accept_ride(UUID) IS
  'Acceptation d''une course par un chauffeur connecté, sous réserve de compatibilité véhicule/équipement (driver_matches_booking), de l''éventuelle fenêtre de priorité de série, de l''absence de suspension pool_suspended_until, et de l''absence de chevauchement avec une autre course déjà acceptée/en cours par ce même chauffeur (schedule_conflict — fenêtres estimées à ~2 min/km, plancher 20 min, marge de battement de 20 min). Stampe accepted_at et propage la priorité de série aux séances restantes.';
