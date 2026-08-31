-- =============================================================================
-- Mon Taxi Santé — limites de taille et de type MIME sur les buckets Storage
--
-- driver-documents (migration 060) et pmt-documents (migration 062) n'avaient
-- ni file_size_limit ni allowed_mime_types : n'importe quel fichier, de
-- n'importe quelle taille, pouvait être déposé — seul l'attribut HTML
-- `accept` du <input type="file"> (contournable trivialement) limitait le
-- choix côté navigateur. Step8PMT.tsx affiche déjà "JPG, PNG ou PDF — max
-- 10 Mo" au patient : cette migration rend cette promesse réelle plutôt que
-- purement cosmétique, au niveau du bucket plutôt que du client.
-- =============================================================================

UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10 Mo
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('driver-documents', 'pmt-documents');
