-- Réglages globaux du site, pilotés depuis le panel admin
-- (/admin/parametres). Table singleton : une seule ligne, id fixé à true.
-- phone_number_visible contrôle l'affichage du numéro standard
-- (src/lib/contact.ts) sur toutes les pages publiques où il apparaît —
-- lecture publique (anon + authenticated), écriture réservée aux admins.

CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  phone_number_visible boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.site_settings IS
  'Réglages globaux du site pilotés depuis le panel admin (/admin/parametres). Table singleton (id = true, une seule ligne). phone_number_visible contrôle l''affichage du numéro standard (src/lib/contact.ts) sur toutes les pages publiques.';

INSERT INTO public.site_settings (id) VALUES (true);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings: public read" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "site_settings: admin update" ON public.site_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
