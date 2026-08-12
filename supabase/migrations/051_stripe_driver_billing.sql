-- =============================================================================
-- Migration 051: Stripe billing infrastructure for driver subscriptions
-- (Sprint 3 — voir ROADMAP.md : facturation des abonnements chauffeurs)
-- =============================================================================

-- ─── Idempotence du webhook Stripe ──────────────────────────────────────────
-- Stripe peut renvoyer le même événement plusieurs fois (retries). Le
-- handler (src/routes/api/webhooks/stripe.ts) insère l'id d'événement avant
-- de traiter ; un conflit de clé primaire signale un doublon à ignorer.
-- Lu/écrit uniquement par le webhook via le client service-role — jamais
-- exposé via RPC publique, même principe que admin_login_attempts
-- (migration 045).

CREATE TABLE public.stripe_webhook_events (
  id          TEXT PRIMARY KEY,  -- Stripe event id (evt_...)
  type        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Déduplication des événements webhook Stripe (retries) — écrit uniquement par le handler service-role. Aucune policy RLS accordée à anon/authenticated.';

REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;

-- ─── Traçabilité du plan souscrit ───────────────────────────────────────────
-- driver_subscriptions.plan (texte libre 'mensuel'/'annuel') existe déjà ;
-- on ajoute l'id du Price Stripe correspondant pour retrouver le montant/la
-- périodicité exacts côté Stripe sans les recalculer, et gérer un futur
-- changement de tarifs sans ambiguïté sur les lignes historiques.

ALTER TABLE public.driver_subscriptions
  ADD COLUMN stripe_price_id TEXT;

COMMENT ON COLUMN public.driver_subscriptions.stripe_price_id IS
  'Stripe Price ID (lookup_key driver_monthly / driver_yearly) — NULL pour d''éventuelles lignes historiques pré-Stripe.';
