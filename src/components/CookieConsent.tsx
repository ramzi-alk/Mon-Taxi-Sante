import { useEffect, useState } from "react";
import { applyPostHogConsent, initPostHog } from "~/lib/posthog";

const CONSENT_KEY = "dt_cookie_consent";
const OPEN_EVENT = "dt:open-cookie-preferences";

type ConsentValue = "granted" | "denied";

function pushConsentUpdate(value: ConsentValue) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  });
}

/**
 * Reopens the banner from the "Gérer les cookies" footer link — Consent
 * Mode has no built-in UI, so re-showing the banner is the only way to
 * let a visitor change a choice already stored in localStorage.
 */
export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored !== "granted" && stored !== "denied") {
      setVisible(true);
    }

    const openPreferences = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, openPreferences);
    return () => window.removeEventListener(OPEN_EVENT, openPreferences);
  }, []);

  function choose(value: ConsentValue) {
    localStorage.setItem(CONSENT_KEY, value);
    pushConsentUpdate(value);
    initPostHog();
    applyPostHogConsent(value === "granted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Préférences cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0B0F1C] text-white"
    >
      <div className="container flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-white/70 max-w-2xl">
          Nous utilisons des cookies strictement nécessaires au fonctionnement de la
          réservation, ainsi que des cookies de mesure d&apos;audience et publicitaires
          soumis à votre consentement.{" "}
          <a href="/confidentialite" className="underline hover:text-white">
            En savoir plus
          </a>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-lg border-2 border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:border-white/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-lg bg-[#1244E8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0F38C4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
