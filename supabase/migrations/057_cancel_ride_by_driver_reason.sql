-- =============================================================================
-- Mon Taxi Santé — motif obligatoire à l'annulation chauffeur
--
-- cancel_ride_by_driver() ne demandait jusqu'ici aucune explication : la
-- détection d'"annulation suspecte" est purement temporelle (annulée <10 min
-- après acceptation, alors que la prise en charge restait à >2h — voir
-- migration 030), ce qui pénalise de la même façon un chauffeur qui abuse du
-- système et un chauffeur qui annule pour une raison légitime (le patient l'a
-- prévenu par téléphone, imprévu véhicule…). On ne change pas encore
-- l'algorithme de détection lui-même (prévu en itération suivante, une fois
-- qu'on aura du recul sur les motifs réellement saisis), mais on capture
-- désormais systématiquement le motif dans bookings.cancellation_reason
-- (colonne déjà présente au schéma initial, jusqu'ici utilisée uniquement
-- côté patient via cancel_booking) pour que l'admin puisse arbitrer les
-- suspensions au lieu de les subir aveuglément.
--
-- Changement de signature (UUID) -> (UUID, TEXT) : Postgres traiterait sinon
-- un CREATE OR REPLACE comme une nouvelle surcharge coexistant avec
-- l'ancienne. On supprime donc explicitement l'ancienne avant de créer la
-- nouvelle, pour qu'un seul cancel_ride_by_driver reste appelable via RPC.
-- =============================================================================

DROP FUNCTION IF EXISTS public.cancel_ride_by_driver(UUID);

CREATE FUNCTION public.cancel_ride_by_driver(p_booking_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status         booking_status;
  v_accepted_at    TIMESTAMPTZ;
  v_pickup_datetime TIMESTAMPTZ;
  v_is_suspicious  BOOLEAN;
  v_new_count      SMALLINT;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'cancellation_reason_required';
  END IF;

  SELECT status, accepted_at, pickup_datetime
  INTO v_status, v_accepted_at, v_pickup_datetime
  FROM public.bookings
  WHERE id = p_booking_id AND driver_id = auth.uid();

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;

  IF v_status <> 'accepted' THEN
    RAISE EXCEPTION 'booking_not_cancellable_by_driver';
  END IF;

  v_is_suspicious := v_accepted_at IS NOT NULL
    AND now() - v_accepted_at < interval '10 minutes'
    AND v_pickup_datetime - now() > interval '2 hours';

  UPDATE public.bookings
  SET status = 'available', driver_id = NULL, accepted_at = NULL,
      cancellation_reason = btrim(p_reason)
  WHERE id = p_booking_id;

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

COMMENT ON FUNCTION public.cancel_ride_by_driver(UUID, TEXT) IS
  'Le chauffeur connecté se désiste d''une course qu''il avait acceptée : elle retourne au pool (available, driver_id NULL), avec un motif désormais obligatoire (p_reason -> bookings.cancellation_reason, visible côté admin). Détecte toujours les annulations suspectes (acceptée puis annulée en moins de 10 min, alors que la prise en charge restait à plus de 2h) et suspend le pool au 3e strike — l''algorithme de détection lui-même n''utilise pas encore le motif saisi.';

REVOKE ALL ON FUNCTION public.cancel_ride_by_driver(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_ride_by_driver(UUID, TEXT) TO authenticated;
