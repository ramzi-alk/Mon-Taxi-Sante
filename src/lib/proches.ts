// Carnet local des proches pour lesquels une réservation a déjà été faite
// (aidant réservant régulièrement pour un parent en dialyse, par exemple).
// Le préremplissage existant (bookingPrefill.ts) ne mémorise que la
// *dernière* réservation, tous patients confondus : un aidant qui alterne
// entre deux proches voit les informations de l'un écraser celles de
// l'autre. Ce carnet mémorise plusieurs proches distincts, sélectionnables
// individuellement à l'étape identité (voir Step1Identity.tsx).
const PROCHES_KEY = "mts:proches";
const MAX_PROCHES = 8;

export interface Proche {
  /** Numéro de téléphone du proche — clé stable pour dédupliquer. */
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  birth_date?: string;
  cpam_status?: "ald" | "cmu" | "css" | "standard" | "none";
  mutual_name?: string;
  savedAt: number;
}

export function listProches(): Proche[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Proche[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Idempotent : un proche déjà enregistré (même téléphone) est mis à jour et remonté en tête. */
export function upsertProche(proche: Omit<Proche, "id" | "savedAt">): void {
  if (typeof window === "undefined" || !proche.phone) return;
  try {
    const existing = listProches().filter((p) => p.phone !== proche.phone);
    const next = [{ ...proche, id: proche.phone, savedAt: Date.now() }, ...existing].slice(
      0,
      MAX_PROCHES
    );
    window.localStorage.setItem(PROCHES_KEY, JSON.stringify(next));
  } catch {
    // localStorage indisponible (navigation privée, quota) — dégrade
    // silencieusement, la saisie manuelle reste toujours possible.
  }
}
