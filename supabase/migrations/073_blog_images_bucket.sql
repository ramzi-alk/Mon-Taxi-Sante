-- =============================================================================
-- Mon Taxi Santé — bucket Storage public pour les images de couverture des
-- articles de blog (src/lib/blog-posts.ts).
--
-- Les articles de blog sont des fichiers statiques (src/routes/blog/*.tsx),
-- pas des lignes en base : aucune table dédiée n'est nécessaire pour
-- associer une image à un article. Convention de nommage : le fichier est
-- toujours nommé "{slug}.webp" (voir BlogPost.slug), ce qui suffit à faire
-- le lien de façon déterministe. La compression et la conversion en WebP
-- se font côté client (src/lib/imageCompression.ts) avant l'upload — le
-- bucket n'accepte donc que du WebP déjà compressé, jamais l'image brute.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog-images', 'blog-images', true, 4194304, ARRAY['image/webp']) -- 4 Mo
ON CONFLICT (id) DO NOTHING;

-- Lecture publique : ces images illustrent des pages publiques du site.
CREATE POLICY "blog-images: lecture publique"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- Écriture réservée aux admins (upload initial ET remplacement — upsert
-- déclenche un INSERT ou un UPDATE selon que le fichier existe déjà).
CREATE POLICY "blog-images: admin dépose"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

CREATE POLICY "blog-images: admin remplace"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'blog-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

CREATE POLICY "blog-images: admin supprime"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-images' AND public.is_admin());
