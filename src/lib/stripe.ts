import Stripe from "stripe";

// Server-only — never import this from client components. STRIPE_SECRET_KEY
// is a secret key, same convention as src/lib/resend.ts.
let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    client = new Stripe(apiKey);
  }
  return client;
}

// Prix de l'abonnement chauffeur — voir /chauffeurs/tarifs pour la grille
// affichée aux chauffeurs. Les Price ID sont créés une fois dans le
// dashboard/compte Stripe (voir README ou .env.example) plutôt que recréés
// dynamiquement, pour garder un historique stable des lignes de facturation.
export type DriverSubscriptionPlan = "mensuel" | "annuel";

export function stripePriceIdForPlan(plan: DriverSubscriptionPlan): string {
  const envVar = plan === "mensuel" ? "STRIPE_PRICE_DRIVER_MONTHLY" : "STRIPE_PRICE_DRIVER_YEARLY";
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new Error(`${envVar} is not configured`);
  }
  return priceId;
}
