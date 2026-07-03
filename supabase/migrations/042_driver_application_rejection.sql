-- Sprint 1 (audit panel admin) — permet à l'admin de refuser une candidature
-- chauffeur avec un motif, au lieu du seul "approuver" existant.

ALTER TABLE public.drivers_details
  ADD COLUMN rejected_at timestamptz,
  ADD COLUMN rejected_by uuid REFERENCES public.profiles(id),
  ADD COLUMN rejection_reason text;

COMMENT ON COLUMN public.drivers_details.rejected_at IS
  'Horodatage du refus de la candidature par un admin. NULL = jamais refusée (en attente ou approuvée).';
COMMENT ON COLUMN public.drivers_details.rejection_reason IS
  'Motif du refus, communiqué au candidat par email.';

-- Comptage des réservations par statut, agrégé côté Postgres plutôt que de
-- rapatrier toute la table côté client (voir bookingsRepository.fetchBookingStatusCounts).
-- SECURITY INVOKER (par défaut) : la RLS de la table bookings s'applique à
-- l'appelant, un admin voit tout via la policy "bookings: admin all".
CREATE OR REPLACE FUNCTION public.get_booking_status_counts()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT b.status::text, count(*)
  FROM public.bookings b
  GROUP BY b.status;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_status_counts() TO authenticated;
