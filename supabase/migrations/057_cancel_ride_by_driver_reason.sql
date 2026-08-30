-- =============================================================================
-- Mon Taxi Santé — motif obligatoire à l'annulation chauffeur + historique
--
-- cancel_ride_by_driver() ne demandait jusqu'ici aucune explication : la
-- détection d'"annulation suspecte" est purement temporelle (annulée <10 min
-- après acceptation, alors que la prise en charge restait à >2h — voir
-- migration 030), ce qui pénalise de la même façon un chauffeur qui abuse du
-- système et un chauffeur qui annule pour une raison légitime (le patient l'a
-- prévenu par téléphone, imprévu véhicule…). On ne change pas encore
-- l'algorithme de détection lui-même (prévu en itération suivante, une fois
-- qu'on aura du recul sur les motifs réellement saisis), mais on capture
-- désormais systématiquement le motif.
--
-- booking_driver_cancellations conserve un historique persistant (une ligne
-- par annulation), plutôt que de s'appuyer uniquement sur
-- bookings.cancellation_reason : ce dernier vit sur la ligne de la
-- réservation elle-même, donc si un second chauffeur accepte puis annule à
-- son tour la même course, son motif écraserait celui du premier — perte
-- d'historique inacceptable pour l'arbitrage admin (Sprint 2) et le calcul
-- du taux d'annulation personnel du chauffeur. bookings.cancellation_reason
-- reste renseigné en plus, pour un affichage rapide sans jointure sur la
-- course courante.
--
-- Changement de signature (UUID) -> (UUID, TEXT) : Postgres traiterait sinon
-- un CREATE OR REPLACE comme une nouvelle surcharge coexistant avec
-- l'ancienne. On supprime donc explicitement l'ancienne avant de créer la
-- nouvelle, pour qu'un seul cancel_ride_by_driver reste appelable via RPC.
-- =============================================================================

CREATE TABLE public.booking_driver_cancellations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason         TEXT NOT NULL,
  was_suspicious BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_driver_cancellations IS
  'Historique persistant des désistements chauffeur (une ligne par annulation, contrairement à bookings.cancellation_reason qui ne garde que le dernier motif sur la course). Source pour le détail des annulations suspectes (admin + chauffeur) et le taux d''annulation personnel. Écriture uniquement via cancel_ride_by_driver() SECURITY DEFINER — pas de policy INSERT directe.';

CREATE INDEX idx_booking_driver_cancellations_driver ON public.booking_driver_cancellations(driver_id, cancelled_at DESC);

ALTER TABLE public.booking_driver_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_driver_cancellations: driver read own"
  ON public.booking_driver_cancellations FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "booking_driver_cancellations: admin all"
  ON public.booking_driver_cancellations FOR ALL
  USING (public.is_admin());

DROP FUNCTION IF EXISTS public.cancel_ride_by_driver(UUID);

CREATE FUNCTION public.cancel_ride_by_driver(p_booking_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status          booking_status;
  v_accepted_at     TIMESTAMPTZ;
  v_pickup_datetime TIMESTAMPTZ;
  v_is_suspicious   BOOLEAN;
  v_new_count       SMALLINT;
  v_reason          TEXT;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'cancellation_reason_required';
  END IF;
  v_reason := btrim(p_reason);

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
      cancellation_reason = v_reason
  WHERE id = p_booking_id;

  INSERT INTO public.booking_driver_cancellations (booking_id, driver_id, reason, was_suspicious)
  VALUES (p_booking_id, auth.uid(), v_reason, v_is_suspicious);

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
  'Le chauffeur connecté se désiste d''une course qu''il avait acceptée : elle retourne au pool (available, driver_id NULL), avec un motif désormais obligatoire (p_reason -> bookings.cancellation_reason ET booking_driver_cancellations, voir ce dernier pour l''historique complet). Détecte toujours les annulations suspectes (acceptée puis annulée en moins de 10 min, alors que la prise en charge restait à plus de 2h) et suspend le pool au 3e strike — l''algorithme de détection lui-même n''utilise pas encore le motif saisi.';

REVOKE ALL ON FUNCTION public.cancel_ride_by_driver(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_ride_by_driver(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_ride_by_driver(UUID, TEXT) TO authenticated;
