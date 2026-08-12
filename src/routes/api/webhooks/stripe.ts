import { createServerFileRoute } from "@tanstack/react-start/server";
import type Stripe from "stripe";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { getStripeClient } from "~/lib/stripe";
import { logger } from "~/lib/logger";

// Synchronise l'état d'abonnement chauffeur (drivers_details.subscription_status
// / subscription_ends_at / stripe_customer_id + driver_subscriptions) avec les
// événements Stripe. Voir src/server/billing.ts pour la création des sessions
// Checkout/Portal qui déclenchent ces événements.

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "active" | "past_due" | "cancelled" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "paused":
    default:
      return "past_due";
  }
}

// current_period_end/price vivent sur chaque item plutôt que sur
// Subscription elle-même dans les versions récentes de l'API Stripe.
function firstItem(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  if (!item) throw new Error(`Subscription ${subscription.id} has no items`);
  return item;
}

async function syncSubscriptionToDriver(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const driverProfileId = subscription.metadata?.driver_profile_id ?? null;

  const driverQuery = driverProfileId
    ? admin.from("drivers_details").select("id, profile_id").eq("profile_id", driverProfileId).maybeSingle()
    : admin.from("drivers_details").select("id, profile_id").eq("stripe_customer_id", customerId).maybeSingle();

  const { data: driver, error: driverError } = await driverQuery;
  if (driverError) throw new Error(driverError.message);
  if (!driver) {
    logger.error("webhooks.stripe driver not found for subscription", {
      subscriptionId: subscription.id,
      customerId,
      driverProfileId,
    });
    return;
  }

  const item = firstItem(subscription);
  const localStatus = mapStripeStatus(subscription.status);
  const periodEndIso = new Date(item.current_period_end * 1000).toISOString();
  const plan = subscription.metadata?.plan === "annuel" ? "annuel" : "mensuel";

  const { error: driverUpdateError } = await admin
    .from("drivers_details")
    .update({
      stripe_customer_id: customerId,
      subscription_status: localStatus,
      subscription_ends_at: periodEndIso,
    })
    .eq("id", driver.id);
  if (driverUpdateError) throw new Error(driverUpdateError.message);

  const { data: existingSub, error: existingSubError } = await admin
    .from("driver_subscriptions")
    .select("id")
    .eq("stripe_sub_id", subscription.id)
    .maybeSingle();
  if (existingSubError) throw new Error(existingSubError.message);

  const endedAt =
    subscription.status === "canceled" || subscription.status === "incomplete_expired"
      ? new Date().toISOString()
      : null;

  if (existingSub) {
    const { error } = await admin
      .from("driver_subscriptions")
      .update({
        status: localStatus,
        stripe_price_id: item.price.id,
        ended_at: endedAt,
      })
      .eq("id", existingSub.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin.from("driver_subscriptions").insert({
      driver_id: driver.id,
      stripe_sub_id: subscription.id,
      stripe_price_id: item.price.id,
      plan,
      amount_eur: (item.price.unit_amount ?? 0) / 100,
      status: localStatus,
      ended_at: endedAt,
    });
    if (error) throw new Error(error.message);
  }
}

export const ServerRoute = createServerFileRoute("/api/webhooks/stripe").methods({
  POST: async ({ request }) => {
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      logger.error("webhooks.stripe missing signature or secret");
      return new Response("Bad request", { status: 400 });
    }

    const rawBody = await request.text();
    const stripe = getStripeClient();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      logger.error("webhooks.stripe signature verification failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Invalid signature", { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Idempotence : Stripe peut renvoyer le même événement plusieurs fois.
    const { error: insertEventError } = await admin
      .from("stripe_webhook_events")
      .insert({ id: event.id, type: event.type });
    if (insertEventError) {
      if (insertEventError.code === "23505") {
        logger.info("webhooks.stripe duplicate event ignored", { eventId: event.id });
        return Response.json({ received: true, duplicate: true });
      }
      logger.error("webhooks.stripe event log insert failed", { error: insertEventError.message });
      return new Response("Internal error", { status: 500 });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === "subscription" && session.subscription) {
            const subscriptionId =
              typeof session.subscription === "string" ? session.subscription : session.subscription.id;
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await syncSubscriptionToDriver(admin, subscription);
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          await syncSubscriptionToDriver(admin, subscription);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      logger.error("webhooks.stripe handler failed", {
        eventType: event.type,
        eventId: event.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Internal error", { status: 500 });
    }

    return Response.json({ received: true });
  },
});
