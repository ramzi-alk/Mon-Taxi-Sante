-- Compteur des clics sur les CTA "Appeler" (numéro standard) du site, pour
-- le panel admin. Table alimentée uniquement via track_call_button_click
-- (SECURITY DEFINER) — ni anon ni authenticated n'ont d'accès direct à la
-- table, pour éviter d'y écrire des lignes hors du format attendu.

CREATE TABLE public.call_button_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT call_button_clicks_source_check CHECK (source IN (
    'navbar',
    'footer',
    'booking_form_help',
    'error_boundary',
    'home_hero',
    'home_bottom_cta',
    'city_page',
    'hospital_page',
    'ald_page',
    'faq',
    'my_bookings',
    'booking_confirmation'
  ))
);

COMMENT ON TABLE public.call_button_clicks IS
  'Compteur des clics sur les CTA "Appeler" vers le numéro standard (src/lib/contact.ts), pour le panel admin. N''inclut pas les appels dynamiques patient<->chauffeur (BookingStatusCard/RideCard), qui ciblent un numéro différent à chaque fois.';

CREATE INDEX call_button_clicks_created_at_idx ON public.call_button_clicks (created_at DESC);

ALTER TABLE public.call_button_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_button_clicks: admin read" ON public.call_button_clicks
  FOR SELECT USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.call_button_clicks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_call_button_click(p_source text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.call_button_clicks (source) VALUES (p_source);
EXCEPTION WHEN check_violation THEN
  -- Compteur best-effort, pas une frontière de sécurité : une source
  -- inconnue (client trafiqué) est simplement ignorée plutôt que de faire
  -- échouer l'appel côté utilisateur.
  NULL;
END;
$$;

COMMENT ON FUNCTION public.track_call_button_click(text) IS
  'Enregistre un clic sur un CTA "Appeler" du site. Appelée en fire-and-forget depuis le client, sans bloquer le lien tel: natif.';

REVOKE ALL ON FUNCTION public.track_call_button_click(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_call_button_click(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_call_click_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.call_button_clicks),
    'last_30_days', (SELECT count(*) FROM public.call_button_clicks WHERE created_at >= now() - interval '30 days'),
    'by_source', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('source', s.source, 'count', s.n) ORDER BY s.n DESC)
        FROM (
          SELECT source, count(*) AS n
          FROM public.call_button_clicks
          GROUP BY source
        ) s
      ),
      '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_call_click_stats() IS
  'Total des clics sur les CTA "Appeler" du site, avec répartition par emplacement, pour le panel admin (KpiSection de /admin/statistiques).';

GRANT EXECUTE ON FUNCTION public.get_admin_call_click_stats() TO authenticated;
