-- Admin reservations tab, lot 4: internal notes + billing status tracking.

-- ─── Payment / invoicing status ─────────────────────────────────────────────
-- Manual admin-side accounts-receivable tracking — distinct from
-- bookings.estimated_price (the fare) and unrelated to any online payment
-- flow (there isn't one yet: patients aren't charged through the app).

CREATE TYPE public.booking_payment_status AS ENUM ('non_facture', 'facture', 'encaisse', 'sans_objet');

ALTER TABLE public.bookings
  ADD COLUMN payment_status public.booking_payment_status NOT NULL DEFAULT 'non_facture';

COMMENT ON COLUMN public.bookings.payment_status IS
  'Suivi comptable manuel côté admin : non_facture (à traiter), facture (envoyée, encaissement en attente), encaisse (réglé), sans_objet (annulée / prestataire externe — aucune facturation Docteur Taxi).';

-- Already covered by the existing "bookings: admin all" RLS policy (001) and
-- by the log_admin_activity trigger (045), which journals the whole row —
-- no new policy or trigger needed for this column.

-- ─── Notes internes admin ───────────────────────────────────────────────────
-- Free-form append-only note feed per booking, distinct from
-- bookings.medical_notes (patient-entered) — team-only, never exposed to the
-- patient or driver. No UPDATE/DELETE policy: notes are permanent once
-- posted, same append-only posture as admin_activity_log.

CREATE TABLE public.booking_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id),
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_admin_notes IS
  'Notes internes libres ajoutées par l''équipe admin sur une réservation (suivi opérationnel) — jamais exposées au patient ni au chauffeur. Append-only : aucune policy UPDATE/DELETE.';

CREATE INDEX booking_admin_notes_booking_id_idx ON public.booking_admin_notes (booking_id, created_at DESC);

ALTER TABLE public.booking_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_admin_notes: admin select" ON public.booking_admin_notes
  FOR SELECT USING (public.is_admin());

CREATE POLICY "booking_admin_notes: admin insert" ON public.booking_admin_notes
  FOR INSERT WITH CHECK (public.is_admin() AND author_id = auth.uid());
