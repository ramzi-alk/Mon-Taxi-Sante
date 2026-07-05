import communesData from "~/data/seo/communes.json";
import hospitalsData from "~/data/seo/hospitals.json";

export interface Commune {
  codeInsee: string;
  nom: string;
  slug: string;
  codeDepartement: string;
  departementSlug: string;
  departementNom: string;
  codeRegion: string;
  population: number | null;
  codePostal: string | null;
}

export interface Hospital {
  finess: string | null;
  nom: string;
  categorie: string | null;
  adresse: string | null;
  codePostal: string | null;
  codeInseeCommune: string | null;
  communeNom: string | null;
  departementSlug: string | null;
  departementNom: string | null;
  lat: number | null;
  lon: number | null;
  telephone: string | null;
}

export const communes = communesData as Commune[];
export const hospitals = hospitalsData as Hospital[];

// Paris/Lyon/Marseille sont découpées en arrondissements dans FINESS
// (codes INSEE 75101-75120, 69381-69389, 13201-13216) mais en une seule
// commune côté geo.api.gouv.fr (75056, 69123, 13055). Sans ce repli, aucun
// hôpital de ces trois villes ne se relierait à sa page ville.
function normalizeCodeInsee(codeInsee: string): string {
  const n = Number(codeInsee);
  if (codeInsee.startsWith("751") && n >= 75101 && n <= 75120) return "75056";
  if (codeInsee.startsWith("693") && n >= 69381 && n <= 69389) return "69123";
  if (codeInsee.startsWith("132") && n >= 13201 && n <= 13216) return "13055";
  return codeInsee;
}

export const communeByKey = new Map<string, Commune>(
  communes.map((c) => [`${c.departementSlug}/${c.slug}`, c])
);

export const communesByDepartment = new Map<string, Commune[]>();
for (const c of communes) {
  const list = communesByDepartment.get(c.departementSlug) ?? [];
  list.push(c);
  communesByDepartment.set(c.departementSlug, list);
}

const hospitalsByCommune = new Map<string, Hospital[]>();
for (const h of hospitals) {
  if (!h.codeInseeCommune) continue;
  const key = normalizeCodeInsee(h.codeInseeCommune);
  const list = hospitalsByCommune.get(key) ?? [];
  list.push(h);
  hospitalsByCommune.set(key, list);
}

export function getCommune(departmentSlug: string, citySlug: string): Commune | null {
  return communeByKey.get(`${departmentSlug}/${citySlug}`) ?? null;
}

export function getNearbyHospitals(commune: Commune, limit = 6): Hospital[] {
  return (hospitalsByCommune.get(commune.codeInsee) ?? []).slice(0, limit);
}

export function getCommunesForDepartment(departmentSlug: string): Commune[] {
  return (communesByDepartment.get(departmentSlug) ?? [])
    .slice()
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
}

function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const communesSearchIndex = communes.map((c) => ({
  commune: c,
  normalizedNom: normalizeQuery(c.nom),
}));

// Recherche simple (préfixe > sous-chaîne, puis population décroissante) —
// suffisant pour un champ de recherche de ville, pas besoin d'une lib de
// recherche floue pour 5509 entrées.
export function searchCommunes(query: string, limit = 8): Commune[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  const startsWith: Commune[] = [];
  const includes: Commune[] = [];
  for (const { commune, normalizedNom } of communesSearchIndex) {
    if (normalizedNom.startsWith(q)) startsWith.push(commune);
    else if (normalizedNom.includes(q)) includes.push(commune);
  }
  const byPopulationDesc = (a: Commune, b: Commune) => (b.population ?? 0) - (a.population ?? 0);
  return [...startsWith.sort(byPopulationDesc), ...includes.sort(byPopulationDesc)].slice(
    0,
    limit
  );
}
