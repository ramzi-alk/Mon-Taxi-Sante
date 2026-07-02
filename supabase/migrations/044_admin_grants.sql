-- Découple l'accès admin de profiles.role : un compte peut rester
-- 'driver' (ou 'patient') tout en ayant aussi accès au panel admin, via une
-- ligne dans admin_grants plutôt qu'en réécrivant son rôle principal.
-- Pull-forward partiel de "Sprint 9 — rôles graduels" (ROADMAP.md) :
-- seule la distinction admin/super_admin est posée ici, pas encore la
-- matrice de permissions complète évoquée dans ce sprint.

CREATE TABLE public.admin_grants (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_role text NOT NULL DEFAULT 'admin' CHECK (admin_role IN ('admin', 'super_admin')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.admin_grants IS
  'Accès admin indépendant de profiles.role — permet à un compte de garder son rôle principal (patient/driver) tout en ayant aussi accès au panel admin. is_admin() vérifie profiles.role = ''admin'' ET la présence d''une ligne ici.';

ALTER TABLE public.admin_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_grants: own read" ON public.admin_grants
  FOR SELECT USING (profile_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_grants: admin all" ON public.admin_grants
  FOR ALL USING (public.is_admin());

-- is_admin() est utilisée dans les policies RLS de bookings/profiles/
-- drivers_details/booking_ratings — la redéfinir ici propage le nouveau
-- comportement partout d'un coup, sans toucher à ces policies une par une.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.admin_grants
    WHERE profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_grants
    WHERE profile_id = auth.uid() AND admin_role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
