import posthog from "posthog-js";

const CONSENT_KEY = "dt_cookie_consent";

/**
 * Client PostHog (navigateur). Le token public phc_... n'est pas un secret —
 * il n'autorise que l'envoi d'événements, jamais leur lecture — donc pas de
 * garde particulière si la variable est absente en dev : le SDK reste
 * silencieusement inactif.
 */
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";
const POSTHOG_UI_HOST = "https://eu.posthog.com";

let initialized = false;

/**
 * Même choix binaire que le bandeau cookies existant (voir CookieConsent.tsx
 * et le Google Consent Mode v2 dans __root.tsx) : la mesure d'audience est
 * elle aussi soumise au consentement RGPD, donc le SDK démarre opt-out par
 * défaut et n'est activé que si un choix "granted" est déjà stocké.
 */
export function initPostHog() {
  if (initialized || typeof window === "undefined" || !POSTHOG_KEY) return;
  initialized = true;

  const storedConsent = localStorage.getItem(CONSENT_KEY);

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: POSTHOG_UI_HOST,
    person_profiles: "identified_only",
    opt_out_capturing_by_default: storedConsent !== "granted",
    capture_pageview: false, // capturé manuellement (voir PostHogPageview) — navigation SPA sans rechargement
    capture_pageleave: true,
    capture_dead_clicks: true,
    capture_exceptions: true,
    autocapture: true,
    enable_heatmaps: true,
    session_recording: {
      // Formulaire de réservation santé (adresses, notes médicales, CPAM...) :
      // on capture bien la session (clics, scroll, layout) mais on masque la
      // valeur de tous les champs saisis plutôt que de les exposer en clair
      // dans les replays PostHog.
      maskAllInputs: true,
    },
  });
}

export function applyPostHogConsent(granted: boolean) {
  if (typeof window === "undefined" || !initialized) return;
  if (granted) {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export { posthog };
