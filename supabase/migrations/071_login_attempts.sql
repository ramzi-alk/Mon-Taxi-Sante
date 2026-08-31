-- =============================================================================
-- Mon Taxi Santé — Throttling de /connexion (chauffeur / patient)
--
-- /admin/connexion est protégée par Turnstile + verrouillage par email
-- (admin_login_attempts, migration 045). /connexion, elle, appelait
-- supabase.auth.signInWithPassword directement depuis le navigateur, sans
-- aucune défense applicative — asymétrie déjà documentée dans le commentaire
-- de src/server/adminAuth.ts ("stricter than /connexion, which has
-- neither"). Un compte chauffeur expose des revenus et des données
-- personnelles ; un compte patient, des données de santé via les
-- réservations liées — les deux méritent la même protection contre le
-- bourrage d'identifiants que l'admin.
--
-- Table distincte d'admin_login_attempts plutôt que réutilisée : portée
-- différente (tous les rôles, pas seulement admin) et on ne veut pas que le
-- même compteur serve à deux mécanismes de verrouillage différents pour un
-- compte qui serait à la fois admin et chauffeur (admin_grants,
-- migration 044).
-- =============================================================================

CREATE TABLE public.login_attempts (
  email text PRIMARY KEY,
  failed_count int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.login_attempts IS
  'Throttling de /connexion (chauffeur/patient), par email — lu/écrit uniquement par loginServerFn via le client service-role (src/server/auth.ts), même mécanisme que admin_login_attempts (migration 045) pour /admin/connexion. Aucune policy RLS accordée à anon/authenticated.';

REVOKE ALL ON TABLE public.login_attempts FROM PUBLIC, anon, authenticated;
