import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "~/lib/database.types";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { getStripeClient, stripePriceIdForPlan, type DriverSubscriptionPlan } from "~/lib/stripe";
import { withServerFnLogging, logger } from "~/lib/logger";
import { captureServerEvent } from "~/lib/posthogServer";

function appUrl(): string {
  return (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://docteurtaxi.fr";
}

// Même pattern que savePushSubscriptionServerFn (src/server/push.ts) :
// le client passe son access token, on l'échange contre l'utilisateur
// authentifié via un client Supabase scopé, plutôt que de faire confiance à
// un profile_id envoyé tel quel par le client.
async function getAuthenticatedDriver(accessToken: string) {
  const supabase = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const admin = getSupabaseAdminClient();
  const { data: driver, error } = await admin
    .from("drivers_details")
    .select("id, profile_id, stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!driver) throw new Error("Profil chauffeur introuvable.");

  return { user, driver, admin };
}

/**
 * Crée (ou réutilise) le Stripe Customer du chauffeur et démarre une
 * session Stripe Checkout (hébergée par Stripe) pour l'abonnement mensuel
 * ou annuel. Le chauffeur est redirigé vers session.url ; le webhook
 * (src/routes/api/webhooks/stripe.ts) synchronise ensuite drivers_details
 * et driver_subscriptions une fois le paiement confirmé.
 */
export const createDriverCheckoutSessionServerFn = createServerFn({ method: "POST" })
  .validator((input: { accessToken: string; plan: DriverSubscriptionPlan }) =>
    z
      .object({ accessToken: z.string().min(1), plan: z.enum(["mensuel", "annuel"]) })
      .parse(input)
  )
  .handler(async ({ data }) =>
    withServerFnLogging("createDriverCheckoutSession", { plan: data.plan }, async () => {
      const { user, driver, admin } = await getAuthenticatedDriver(data.accessToken);
      const stripe = getStripeClient();

      let customerId = driver.stripe_customer_id;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { driver_profile_id: user.id, drivers_details_id: driver.id },
        });
        customerId = customer.id;
        const { error } = await admin
          .from("drivers_details")
          .update({ stripe_customer_id: customerId })
          .eq("id", driver.id);
        if (error) throw new Error(error.message);
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: stripePriceIdForPlan(data.plan), quantity: 1 }],
        client_reference_id: user.id,
        subscription_data: { metadata: { driver_profile_id: user.id, plan: data.plan } },
        success_url: `${appUrl()}/tableau-de-bord/chauffeur/compte?abonnement=succes`,
        cancel_url: `${appUrl()}/tableau-de-bord/chauffeur/compte?abonnement=annule`,
      });

      if (!session.url) {
        logger.error("billing.createDriverCheckoutSession missing url", { sessionId: session.id });
        throw new Error("Impossible de créer la session de paiement.");
      }

      captureServerEvent(user.id, "driver_checkout_started", { plan: data.plan }).catch(() => {
        // Best-effort — voir captureServerEvent, déjà loggé en interne.
      });

      return { url: session.url };
    })
  );

/**
 * Crée une session Stripe Billing Portal pour que le chauffeur gère lui-même
 * son abonnement (changement de moyen de paiement, annulation). Nécessite un
 * stripe_customer_id existant, donc un premier passage par Checkout.
 */
export const createDriverPortalSessionServerFn = createServerFn({ method: "POST" })
  .validator((input: { accessToken: string }) => z.object({ accessToken: z.string().min(1) }).parse(input))
  .handler(async ({ data }) =>
    withServerFnLogging("createDriverPortalSession", {}, async () => {
      const { driver } = await getAuthenticatedDriver(data.accessToken);
      if (!driver.stripe_customer_id) {
        throw new Error("Aucun abonnement Stripe associé à ce compte pour le moment.");
      }

      const stripe = getStripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: driver.stripe_customer_id,
        return_url: `${appUrl()}/tableau-de-bord/chauffeur/compte`,
      });

      return { url: session.url };
    })
  );
