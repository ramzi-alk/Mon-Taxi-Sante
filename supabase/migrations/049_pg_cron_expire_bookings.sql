-- pg_cron pour rapprocher le délai de bascule 'expired' des 24h du cron
-- Vercel Hobby (voir api/cron/expire-bookings) : ce job tourne toutes les 10
-- minutes directement en base, indépendamment du plan Vercel. Il ne fait que
-- basculer le statut (ce qui déclenche notify_admin_booking_expired,
-- migration 048) — l'envoi de l'email patient reste côté Vercel/Resend
-- (aucun secret d'API externe stocké en base), sur une colonne dédiée
-- expired_notified_at pour ne pas dépendre du timing du changement de
-- statut.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS expired_notified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.expire_overdue_bookings()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.bookings
  SET status = 'expired'
  WHERE status = 'available'
    AND pickup_datetime < now();
$$;

COMMENT ON FUNCTION public.expire_overdue_bookings IS
  'Bascule en ''expired'' toute course encore ''available'' dont pickup_datetime est passé. Appelée uniquement par le pg_cron job expire-overdue-bookings ci-dessous (toutes les 10 min, en tant que postgres) — pas de grant vers authenticated/anon.';

REVOKE ALL ON FUNCTION public.expire_overdue_bookings() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'expire-overdue-bookings',
  '*/10 * * * *',
  $$ SELECT public.expire_overdue_bookings(); $$
);
