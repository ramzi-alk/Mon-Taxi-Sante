import posthog from "posthog-js";

let initialized = false;

/**
 * Chargé au montage côté client uniquement (voir __root.tsx) — posthog-js
 * touche `window`/`document` dès l'appel, donc jamais en SSR. Le tracking
 * démarre opt-out et n'est activé que si le consentement cookies (voir
 * CookieConsent.tsx) est déjà accordé, sur le même principe que le Google
 * Consent Mode déjà en place pour gtag.
 */
export function initPostHog(consentGranted: boolean): void {
  if (initialized || typeof window === "undefined") return;

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;

  posthog.init(key, {
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // pageviews envoyées manuellement au changement de route, voir __root.tsx
    capture_pageleave: true,
    opt_out_capturing_by_default: !consentGranted,
  });
  initialized = true;
}

export function setPostHogConsent(granted: boolean): void {
  if (!initialized) return;
  if (granted) posthog.opt_in_capturing();
  else posthog.opt_out_capturing();
}

export { posthog };
