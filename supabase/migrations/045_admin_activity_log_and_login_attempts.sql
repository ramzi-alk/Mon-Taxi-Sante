-- Sprint 9 (suite) — journal des actions admin + throttling de connexion
-- dédié à /admin/connexion.

-- ─── Journal des actions admin ──────────────────────────────────────────────
-- Alimenté uniquement par un trigger SECURITY DEFINER (voir plus bas) — pas
-- de policy INSERT/UPDATE/DELETE pour authenticated, donc même un admin ne
-- peut pas modifier ou effacer une entrée via l'API REST.

CREATE TABLE public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  target_table text NOT NULL,
  target_id text NOT NULL,
  before jsonb,
  after jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_activity_log IS
  'Journal en lecture seule (pour les clients API) des écritures admin sur les tables sensibles. Alimenté uniquement par log_admin_activity() (trigger SECURITY DEFINER) — aucune policy d''écriture accordée à authenticated.';

CREATE INDEX admin_activity_log_created_at_idx ON public.admin_activity_log (created_at DESC);
CREATE INDEX admin_activity_log_actor_id_idx ON public.admin_activity_log (actor_id);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_activity_log: admin read" ON public.admin_activity_log
  FOR SELECT USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.log_admin_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_before := to_jsonb(OLD);
  v_after := to_jsonb(NEW);

  -- Colonnes HDS/PII retirées du journal — l'objectif est de tracer QUOI a
  -- changé opérationnellement (statut, chauffeur assigné, suspension...),
  -- pas de dupliquer des données de santé/documents dans un second endroit.
  IF TG_TABLE_NAME = 'bookings' THEN
    v_before := v_before - 'medical_notes' - 'patient_birth_date' - 'pmt_file_url'
                         - 'patient_phone' - 'patient_email' - 'booker_phone' - 'booker_email';
    v_after := v_after - 'medical_notes' - 'patient_birth_date' - 'pmt_file_url'
                        - 'patient_phone' - 'patient_email' - 'booker_phone' - 'booker_email';
  ELSIF TG_TABLE_NAME = 'drivers_details' THEN
    v_before := v_before - 'driving_licence_url' - 'insurance_url' - 'cpam_certificate_url';
    v_after := v_after - 'driving_licence_url' - 'insurance_url' - 'cpam_certificate_url';
  END IF;

  INSERT INTO public.admin_activity_log (actor_id, action, target_table, target_id, before, after)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((NEW).id, (OLD).id)::text,
    v_before,
    v_after
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.log_admin_activity IS
  'Trigger AFTER UPDATE — journalise une écriture uniquement quand is_admin() est vrai pour l''appelant (une écriture patient/chauffeur normale, passant par les RPC habituelles, n''est jamais journalisée ici).';

CREATE TRIGGER log_admin_activity_bookings
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

CREATE TRIGGER log_admin_activity_drivers_details
  AFTER UPDATE ON public.drivers_details
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

CREATE TRIGGER log_admin_activity_booking_ratings
  AFTER UPDATE ON public.booking_ratings
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_activity();

-- Trigger-only function — must never be callable directly as an RPC
-- (REVOKE doesn't block the trigger itself from firing; only direct
-- /rest/v1/rpc/log_admin_activity calls).
REVOKE ALL ON FUNCTION public.log_admin_activity() FROM PUBLIC, anon, authenticated;

-- ─── Throttling de /admin/connexion ─────────────────────────────────────────
-- Distinct de booking_lookup_attempts : keyed par email plutôt que par
-- booking, et gardé pour un usage exclusivement serveur (adminLoginServerFn,
-- via le client service-role) — jamais exposé via une RPC publique, donc pas
-- besoin d'un mécanisme SECURITY DEFINER ici.

CREATE TABLE public.admin_login_attempts (
  email text PRIMARY KEY,
  failed_count int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_login_attempts IS
  'Throttling de /admin/connexion, par email — lu/écrit uniquement par adminLoginServerFn via le client service-role (src/server/adminAuth.ts). Aucune policy RLS accordée à anon/authenticated.';

REVOKE ALL ON TABLE public.admin_login_attempts FROM PUBLIC, anon, authenticated;
