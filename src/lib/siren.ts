// Search companies via the French government's public "Recherche
// d'entreprises" API (api.gouv.fr), built on top of the INSEE Sirene
// register. Free, no API key, CORS-enabled — same integration pattern as
// the BAN address API used in AddressAutocomplete. Accepts a free-text
// query: company name, SIREN, or SIRET.
//
// Rate limit: 7 req/s (the admin may lower it under server load), enforced
// server-side via HTTP 429 — surfaced as SirenRateLimitedError so callers
// can distinguish it from "no results".

const SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search";
const MAX_RESULTS = 5;

export interface CompanySuggestion {
  siret: string;
  name: string;
  address: string | null;
  active: boolean;
}

interface Etablissement {
  siret: string;
  adresse?: string | null;
  etat_administratif?: string;
}

interface SearchResult {
  nom_complet?: string;
  nom_raison_sociale?: string;
  siege?: Etablissement;
  matching_etablissements?: Etablissement[];
}

interface SearchResponse {
  results: SearchResult[];
}

export class SirenRateLimitedError extends Error {
  constructor() {
    super("Service de vérification SIRET momentanément surchargé. Réessayez dans un instant.");
  }
}

export async function searchCompanies(
  query: string,
  signal?: AbortSignal
): Promise<CompanySuggestion[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&per_page=${MAX_RESULTS}`;
  const res = await fetch(url, { signal });
  if (res.status === 429) throw new SirenRateLimitedError();
  if (!res.ok) throw new Error(`API Recherche d'entreprises a répondu ${res.status}`);

  const data: SearchResponse = await res.json();
  const suggestions: CompanySuggestion[] = [];

  for (const result of data.results ?? []) {
    const name = result.nom_complet ?? result.nom_raison_sociale ?? "Entreprise inconnue";
    const etablissements = result.matching_etablissements?.length
      ? result.matching_etablissements
      : result.siege
      ? [result.siege]
      : [];

    for (const etab of etablissements) {
      suggestions.push({
        siret: etab.siret,
        name,
        address: etab.adresse ?? null,
        active: etab.etat_administratif === "A",
      });
      if (suggestions.length >= MAX_RESULTS) return suggestions;
    }
  }

  return suggestions;
}
