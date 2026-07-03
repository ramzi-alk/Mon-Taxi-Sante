-- Bug préexistant (migration 001) : bookings_pickup_datetime_check était un
-- CHECK (pickup_datetime > now()) au niveau table, donc réévalué sur CHAQUE
-- UPDATE de la ligne, y compris quand pickup_datetime n'est pas modifié.
-- Conséquence : dès qu'une course a son heure de départ passée, plus aucune
-- mise à jour n'est possible dessus — ça bloque complete_ride(),
-- cancel_booking(), et désormais expire_overdue_bookings() (migration 049).
-- Découvert en testant manuellement expire_overdue_bookings() : les seules
-- courses completed/cancelled existantes avaient toutes été modifiées AVANT
-- leur pickup_datetime (données de test), ce qui explique que ça n'ait
-- jamais été déclenché en usage réel.
--
-- Remplacé par un trigger scopé à INSERT et aux UPDATE qui touchent
-- effectivement pickup_datetime : même garde-fou (impossible de créer ou de
-- reprogrammer une course dans le passé), mais un changement de statut seul
-- ne re-déclenche plus la vérification.
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_pickup_datetime_check;

CREATE OR REPLACE FUNCTION public.enforce_future_pickup_datetime()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pickup_datetime <= now() THEN
    RAISE EXCEPTION 'pickup_datetime must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_future_pickup_datetime IS
  'Remplace bookings_pickup_datetime_check (voir migration 050) : valide qu''on ne crée/reprogramme pas une course dans le passé, sans bloquer les mises à jour de statut (complete_ride, cancel_booking, expire_overdue_bookings) sur une course déjà passée.';

CREATE TRIGGER bookings_pickup_datetime_future
  BEFORE INSERT OR UPDATE OF pickup_datetime ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_future_pickup_datetime();
