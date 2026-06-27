-- =============================================================================
-- Mon Taxi Santé — Backfill profiles missing despite handle_new_user(), and
-- make the trigger idempotent.
--
-- Some real (non-anonymous) email/password signups ended up with an
-- auth.users row but no matching public.profiles row, even though
-- on_auth_user_created (AFTER INSERT ON auth.users) is enabled, unconditional,
-- and owned by the same role as public.profiles (so RLS isn't the cause).
-- No Postgres error was logged for the affected inserts, so the exact trigger
-- failure mode is unconfirmed — this is a known class of issue with
-- GoTrue-driven inserts on auth.users. Rather than depend on a single
-- fire-and-forget trigger for data this critical, we:
--   1. Make the trigger idempotent (ON CONFLICT DO NOTHING) so retries/races
--      can't fail on a duplicate key.
--   2. Backfill any auth.users row that is currently missing its profile.
-- Server code (submitDriverApplicationServerFn) is also updated to self-heal
-- a missing profile on demand, so this isn't the only safety net.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Patient'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Patient'),
  COALESCE((u.raw_user_meta_data->>'role')::user_role, 'patient')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
