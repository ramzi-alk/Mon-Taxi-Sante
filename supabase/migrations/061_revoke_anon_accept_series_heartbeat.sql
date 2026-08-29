-- =============================================================================
-- Mon Taxi Santé — ferme l'accès anon sur accept_series() / update_driver_heartbeat()
--
-- Repéré via l'advisor sécurité Supabase : ces deux fonctions (créées hors
-- du process de migration normal — voir 058) sont exécutables par le rôle
-- `anon` via /rest/v1/rpc/accept_series et /rest/v1/rpc/update_driver_heartbeat.
-- Même cause que documentée dans la migration 011 : Supabase accorde EXECUTE
-- à anon/authenticated par défaut sur les fonctions créées hors du process
-- de migration standard, et "REVOKE ALL ... FROM PUBLIC" (voir 058) ne
-- retire que le privilège hérité de PUBLIC — pas ce grant explicite fait
-- séparément à anon.
--
-- Non exploitable en pratique (auth.uid() est NULL pour anon, donc chaque
-- clause `WHERE ... = auth.uid()` à l'intérieur ne matche aucune ligne),
-- mais ces fonctions n'ont aucun sens hors session connectée : on ferme
-- explicitement plutôt que de compter sur cet effet de bord.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.accept_series(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_driver_heartbeat() FROM anon;
