-- =============================================================================
-- Mon Taxi Santé — cancel_series()
--
-- Un chauffeur peut se désister de l'intégralité des séances d'une série
-- qu'il a acceptées en un seul appel, plutôt que d'appeler
-- cancel_ride_by_driver() N fois.
--
-- Logique de fiabilité : l'ensemble de la série compte comme UN seul
-- événement d'annulation (pas N), pour ne pas pénaliser un chauffeur
-- qui se rend compte rapidement qu'il ne peut pas assurer toute une
-- série. Le test "suspicieux" porte sur la première séance (accepted_at
-- le plus ancien, pickup_datetime le plus proche) par cohérence avec la
-- logique existante de cancel_ride_by_driver.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_series(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_id         UUID;
  v_first_accepted_at TIMESTAMPTZ;
  v_first_pickup_dt   TIMESTAMPTZ;
  v_is_suspicious     BOOLEAN;
  v_new_count         SMALLINT;
BEGIN
  -- Vérifie la propriété et récupère series_id
  SELECT series_id INTO v_series_id
  FROM public.bookings
  WHERE id = p_booking_id
    AND driver_id = auth.uid()
    AND status = 'accepted';

  IF v_series_id IS NULL THEN
    RAISE EXCEPTION 'booking_not_found_or_not_cancellable';
  END IF;

  -- Timing pour la détection d'annulation suspecte (1 événement pour la série)
  SELECT MIN(accepted_at), MIN(pickup_datetime)
  INTO v_first_accepted_at, v_first_pickup_dt
  FROM public.bookings
  WHERE series_id = v_series_id
    AND driver_id = auth.uid()
    AND status = 'accepted';

  v_is_suspicious := v_first_accepted_at IS NOT NULL
    AND now() - v_first_accepted_at < interval '10 minutes'
    AND v_first_pickup_dt - now() > interval '2 hours';

  -- Remet toutes les séances acceptées de la série dans le pool
  UPDATE public.bookings
  SET status = 'available', driver_id = NULL, accepted_at = NULL
  WHERE series_id = v_series_id
    AND driver_id = auth.uid()
    AND status = 'accepted';

  -- Un seul événement suspicieux par annulation de série
  IF v_is_suspicious THEN
    UPDATE public.drivers_details
    SET suspicious_cancellation_count = suspicious_cancellation_count + 1
    WHERE profile_id = auth.uid()
    RETURNING suspicious_cancellation_count INTO v_new_count;

    IF v_new_count >= 3 THEN
      UPDATE public.drivers_details
      SET pool_suspended_until = now() + interval '7 days'
      WHERE profile_id = auth.uid();
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.cancel_series IS
  'Driver backs out of all accepted bookings in the same series as p_booking_id. Returns them to the pool (available, driver_id/accepted_at cleared). Counts as a single suspicious-cancellation event for the series (not one per booking) to avoid unfairly penalising a driver who quickly realises they cannot cover the whole series. The app is responsible for notifying the patient once (see notifyRideUnassignedServerFn series logic).';

REVOKE ALL ON FUNCTION public.cancel_series(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_series(UUID) TO authenticated;
