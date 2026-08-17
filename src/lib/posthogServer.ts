import { PostHog } from "posthog-node";
import { logger } from "./logger";

const POSTHOG_KEY = process.env.POSTHOG_KEY ?? process.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) return null;
  if (!client) {
    client = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      // Environnement serverless (Vercel) : la fonction peut se terminer
      // juste après le retour du handler, donc on envoie chaque événement
      // immédiatement plutôt que de le laisser dans un buffer périodique.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Événements métier capturés côté serveur (réservation créée, candidature
 * chauffeur, changement d'abonnement...) — fiable même avec un bloqueur de
 * pub côté client, contrairement au seul autocapture navigateur. `distinctId`
 * doit être un identifiant opaque (profile_id) : jamais de nom, téléphone,
 * e-mail ou note médicale dans `properties`, ces champs restent en base
 * Supabase uniquement.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const posthog = getClient();
  if (!posthog) return;

  try {
    posthog.capture({ distinctId, event, properties });
    await posthog.flush();
  } catch (err) {
    logger.error("posthogServer.captureServerEvent failed", {
      event,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
