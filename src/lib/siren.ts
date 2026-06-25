// Lookup company info from the French government's public "Recherche
// d'entreprises" API (api.gouv.fr), built on top of the INSEE Sirene
// register. Free, no API key, CORS-enabled — same integration pattern as
// the BAN address API used in AddressAutocomplete.

const SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search";

export interface CompanyInfo {
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

export class SiretNotFoundError extends Error {
  constructor() {
    super("SIRET introuvable. Vérifiez le numéro saisi.");
  }
}

export async function lookupCompanyBySiret(
  siret: string,
  signal?: AbortSignal
): Promise<CompanyInfo> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(siret)}&per_page=1`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`API Recherche d'entreprises a répondu ${res.status}`);

  const data: SearchResponse = await res.json();
  const result = data.results?.[0];
  if (!result) throw new SiretNotFoundError();

  const etablissement =
    result.matching_etablissements?.find((e) => e.siret === siret) ?? result.siege;
  if (!etablissement) throw new SiretNotFoundError();

  const name = result.nom_complet ?? result.nom_raison_sociale ?? "Entreprise inconnue";
  return {
    name,
    address: etablissement.adresse ?? null,
    active: etablissement.etat_administratif === "A",
  };
}
