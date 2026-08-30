// Un aidant qui gère plusieurs réservations (ex: dialyse d'un parent) devait
// jusqu'ici ressaisir référence + téléphone à chaque visite pour chacune,
// la recherche par référence (BookingLookupForm) ne persistant jamais son
// résultat. Cette liste mémorise seulement de quoi relancer la recherche
// (référence + téléphone), jamais le contenu de la réservation elle-même —
// celui-ci est toujours re-vérifié côté serveur à chaque affichage.
const SAVED_LOOKUPS_KEY = "mts:saved_lookups";
const MAX_SAVED_LOOKUPS = 10;

export interface SavedLookup {
  referenceCode: string;
  phone: string;
  savedAt: number;
}

export function listSavedLookups(): SavedLookup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_LOOKUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedLookup[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Idempotent : une référence déjà enregistrée est simplement remontée en tête. */
export function saveLookup(referenceCode: string, phone: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = listSavedLookups().filter((l) => l.referenceCode !== referenceCode);
    const next = [{ referenceCode, phone, savedAt: Date.now() }, ...existing].slice(
      0,
      MAX_SAVED_LOOKUPS
    );
    window.localStorage.setItem(SAVED_LOOKUPS_KEY, JSON.stringify(next));
  } catch {
    // localStorage indisponible (navigation privée, quota) — dégrade
    // silencieusement, la recherche manuelle reste toujours possible.
  }
}

export function isLookupSaved(referenceCode: string): boolean {
  return listSavedLookups().some((l) => l.referenceCode === referenceCode);
}

export function removeSavedLookup(referenceCode: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = listSavedLookups().filter((l) => l.referenceCode !== referenceCode);
    window.localStorage.setItem(SAVED_LOOKUPS_KEY, JSON.stringify(next));
  } catch {
    // Voir saveLookup.
  }
}
