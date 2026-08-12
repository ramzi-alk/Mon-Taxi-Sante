import { createServerFileRoute } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { logger } from "~/lib/logger";

// Bascule 'trial' → 'past_due' pour les chauffeurs dont l'essai gratuit de
// 30 jours (subscription_ends_at, posé à l'approbation — voir
// driversRepository.approveDriver) est dépassé sans abonnement Stripe payant
// actif. Un abonnement payant (webhook Stripe, voir
// src/routes/api/webhooks/stripe.ts) écrase déjà subscription_status/
// subscription_ends_at avant ou après cette échéance, donc ce cron n'agit
// que sur les chauffeurs qui n'ont jamais souscrit. Ne bloque aucun accès
// (pool/tableau de bord) — signale seulement le statut pour l'admin et pour
// "Mon compte" ; le blocage effectif est une décision produit séparée.
function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export const ServerRoute = createServerFileRoute("/api/cron/expire-driver-trials").methods({
  GET: async ({ request }) => {
    if (!isAuthorized(request)) {
      logger.error("cron.expire-driver-trials unauthorized");
      return new Response("Unauthorized", { status: 401 });
    }

    logger.info("cron.expire-driver-trials started");

    const admin = getSupabaseAdminClient();

    const { data, error } = await admin
      .from("drivers_details")
      .update({ subscription_status: "past_due" })
      .eq("subscription_status", "trial")
      .lt("subscription_ends_at", new Date().toISOString())
      .select("id");

    if (error) {
      logger.error("cron.expire-driver-trials update failed", { error: error.message });
      return Response.json({ expired: 0, error: error.message }, { status: 500 });
    }

    const expired = data?.length ?? 0;
    logger.info("cron.expire-driver-trials completed", { expired });
    return Response.json({ expired });
  },
});
