-- =============================================================================
-- Mon Taxi Santé — backfill de documentation : accept_series() et
-- update_driver_heartbeat()
--
-- Ces deux fonctions existent réellement en base (appliquées via une
-- migration historique nommée "037_heartbeat_and_accept_series" côté
-- Supabase), mais le fichier `037_*.sql` de ce dépôt a depuis été réutilisé
-- pour un tout autre contenu ("booking_vehicle_ambulance") — collision de
-- numérotation qui a fait perdre la trace du SQL réel dans Git (idem pour
-- "036", réutilisé alors qu'un "036_add_series_id_to_active_view" existait
-- déjà en base).
--
-- Ce fichier ne change RIEN au comportement de la base (CREATE OR REPLACE
-- reproduisant exactement le corps déjà en place, vérifié via
-- pg_get_functiondef) — il comble uniquement le trou de traçabilité dans le
-- dépôt. accept_series() délègue à accept_ride() ligne par ligne : la
-- détection de chevauchement d'horaires ajoutée en migration 056 s'applique
-- donc déjà automatiquement à l'acceptation d'une série complète, sans code
-- supplémentaire.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.accept_series(p_booking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series_id UUID;
  v_bid       UUID;
BEGIN
  SELECT series_id INTO v_series_id FROM bookings WHERE id = p_booking_id;

  IF v_series_id IS NULL THEN
    RAISE EXCEPTION 'booking_not_series';
  END IF;

  FOR v_bid IN
    SELECT id FROM bookings
    WHERE series_id = v_series_id
      AND status = 'available'
    ORDER BY series_index
  LOOP
    PERFORM accept_ride(v_bid);
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.accept_series(UUID) IS
  'Accepte en une fois toutes les séances encore disponibles de la série de p_booking_id, en déléguant à accept_ride() pour chacune (donc soumis aux mêmes règles : compatibilité véhicule, priorité de série, suspension de pool, chevauchement d''horaires — migration 056).';

REVOKE ALL ON FUNCTION public.accept_series(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_series(UUID) TO authenticated;

-- ─── update_driver_heartbeat(): idem, également sans trace dans le dépôt ───

CREATE OR REPLACE FUNCTION public.update_driver_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE drivers_details
  SET last_heartbeat_at = now()
  WHERE profile_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.update_driver_heartbeat() IS
  'Appelée toutes les 30s par le tableau de bord chauffeur tant que le chauffeur est "en ligne" (voir chauffeur.tsx) — stampe last_heartbeat_at. Aucun cron ne consomme encore cette colonne pour repasser automatiquement un chauffeur hors ligne après une absence prolongée de heartbeat (cf. DRIVER_UX_AUDIT.md #2, non livré).';

REVOKE ALL ON FUNCTION public.update_driver_heartbeat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_driver_heartbeat() TO authenticated;
