-- =============================================================================
-- Mon Taxi Santé — centre de documents chauffeur
--
-- drivers_details avait déjà cpam_certificate_url / driving_licence_url /
-- insurance_url (texte, nullable) mais aucun bucket Storage ni aucune UI ne
-- les exploitait jamais — 0 bucket n'existe dans ce projet Supabase à ce
-- jour (vérifié : select count(*) from storage.buckets = 0). NB : ça laisse
-- supposer que l'upload PMT côté patient (BookingForm.tsx, bucket
-- "pmt-documents") est dans le même cas — hors périmètre de cette migration,
-- signalé séparément.
--
-- On renomme les 3 colonnes *_url en *_path : elles stockeront le chemin
-- dans le bucket privé driver-documents, pas une URL publique — un document
-- d'identité/professionnel chauffeur n'a pas vocation à être lisible par
-- n'importe qui avec le lien, contrairement à un asset marketing. L'URL
-- réelle est générée à la demande via une Signed URL (courte durée de vie),
-- pas stockée. Ajoute une date d'expiration sur les deux documents qui en
-- ont une dans la vraie vie (certificat CPAM, assurance) — pas sur le permis
-- de conduire.
-- =============================================================================

ALTER TABLE public.drivers_details
  RENAME COLUMN cpam_certificate_url TO cpam_certificate_path;
ALTER TABLE public.drivers_details
  RENAME COLUMN driving_licence_url TO driving_licence_path;
ALTER TABLE public.drivers_details
  RENAME COLUMN insurance_url TO insurance_path;

ALTER TABLE public.drivers_details
  ADD COLUMN cpam_certificate_expires_at DATE,
  ADD COLUMN insurance_expires_at DATE;

COMMENT ON COLUMN public.drivers_details.cpam_certificate_path IS 'Chemin dans le bucket Storage privé driver-documents (pas une URL publique) — voir getSignedDocumentUrl côté client.';
COMMENT ON COLUMN public.drivers_details.driving_licence_path IS 'Chemin dans le bucket Storage privé driver-documents.';
COMMENT ON COLUMN public.drivers_details.insurance_path IS 'Chemin dans le bucket Storage privé driver-documents.';
COMMENT ON COLUMN public.drivers_details.cpam_certificate_expires_at IS 'Date de fin de validité déclarée par le chauffeur. Aucune alerte automatique pour l''instant (prévu en itération suivante).';
COMMENT ON COLUMN public.drivers_details.insurance_expires_at IS 'Date de fin de validité déclarée par le chauffeur. Aucune alerte automatique pour l''instant (prévu en itération suivante).';

-- ─── Bucket privé + policies ─────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Convention de chemin : {profile_id}/{type}-{timestamp}.{ext} — le premier
-- segment (storage.foldername(name)[1]) scope chaque policy au chauffeur
-- propriétaire, même mécanisme que les autres buckets utilisateur Supabase.

CREATE POLICY "driver-documents: chauffeur lit ses fichiers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "driver-documents: chauffeur dépose ses fichiers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "driver-documents: chauffeur remplace ses fichiers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "driver-documents: chauffeur supprime ses fichiers"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'driver-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "driver-documents: admin lit tout"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-documents' AND public.is_admin());
