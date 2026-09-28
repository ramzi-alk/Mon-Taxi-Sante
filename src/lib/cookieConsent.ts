export type ConsentValue = "granted" | "denied";

const CONSENT_KEY = "dt_cookie_consent";

/** null = pas encore de choix stocké (bannière à afficher). */
export function getStoredConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function storeConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Stockage indisponible (navigation privée stricte, quota) — le choix ne
    // persistera pas, mais ne doit pas empêcher la fermeture de la bannière.
  }
}
