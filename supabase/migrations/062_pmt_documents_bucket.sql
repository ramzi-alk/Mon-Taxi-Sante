-- =============================================================================
-- Mon Taxi Santé — bucket Storage pour le PMT (Prescription Médicale de
-- Transport) côté patient
--
-- BookingForm.tsx uploadait déjà vers un bucket "pmt-documents" censé
-- exister — mais aucun bucket Storage n'existe sur ce projet
-- (select count(*) from storage.buckets = 0 avant cette migration).
-- storageRepository.uploadFile catch l'erreur et retourne null : l'upload
-- échouait silencieusement, la réservation continuait sans le fichier
-- (pmt_file_url restait NULL) — aucun crash visible, mais la pièce jointe
-- PMT n'était jamais réellement stockée. Signalé lors du Sprint 2 chauffeur,
-- corrigé ici séparément (voir DRIVER_DASHBOARD_SPRINT_PLAN.md).
--
-- Renomme pmt_file_url -> pmt_file_path : même raisonnement que pour les
-- documents chauffeur (migration 060) et cohérent avec le commentaire déjà
-- présent au schéma initial ("HDS-sensitive") — un document de prescription
-- médicale n'a pas vocation à être lisible par n'importe qui avec le lien.
-- Bucket privé, URL générée à la demande via Signed URL (createSignedUrl),
-- jamais stockée. pmt_file_path est actuellement écrit mais jamais lu
-- ailleurs dans le code (aucune vue admin/chauffeur ne l'expose) : aucun
-- autre site à mettre à jour.
-- =============================================================================

ALTER TABLE public.bookings
  RENAME COLUMN pmt_file_url TO pmt_file_path;

COMMENT ON COLUMN public.bookings.pmt_file_path IS 'Chemin dans le bucket Storage privé pmt-documents (pas une URL publique) — document HDS-sensible, généré à la demande via une Signed URL. Écrit à la soumission de la réservation (BookingForm.tsx), pas encore consulté ailleurs dans le produit.';

-- ─── Bucket privé + policies ─────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('pmt-documents', 'pmt-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Convention de chemin : {patient_id}/{timestamp}.{ext} — patient_id est
-- l'auth.uid() de la session anonyme Supabase créée à la réservation
-- (getOrCreatePatientSession, BookingForm.tsx), pas un vrai compte : même
-- mécanisme de scoping par premier segment de chemin que driver-documents.

CREATE POLICY "pmt-documents: patient dépose son fichier"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pmt-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pmt-documents: patient lit son fichier"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pmt-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "pmt-documents: admin lit tout"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pmt-documents' AND public.is_admin());
