import communesData from "~/data/seo/communes.json";
import hospitalsData from "~/data/seo/hospitals.json";
import cityCopyData from "~/data/seo/city-copy.json";

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
  // lat/lon/surfaceHectares/epciNom : ajoutés par fetch-communes.mjs — absents
  // de communes.json tant que le script n'a pas été relancé après cet ajout
  // (voir ROADMAP-SEO.md). Traiter comme potentiellement absents malgré le
  // typage non optionnel.
  lat: number | null;
  lon: number | null;
  surfaceHectares: number | null;
  epciNom: string | null;
  // Introduction générée par LLM (scripts/seo-data/generate-copy.mjs) à partir
  // des données réelles de la ville — null tant que le script n'a pas encore
  // été lancé pour cette commune (les pages retombent alors sur un texte
  // générique, voir $department.$city.tsx).
  introText: string | null;
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
  // Absent pour les établissements non reliés à une ville connue (pas de
  // page /hopitaux/$slug dans ce cas — voir fetch-hospitals.mjs).
  slug?: string;
}

const cityCopy = cityCopyData as Record<string, string>;

export const communes = (communesData as Omit<Commune, "introText">[]).map((c) => ({
  ...c,
  introText: cityCopy[c.codeInsee] ?? null,
})) as Commune[];
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

export const communeByCodeInsee = new Map<string, Commune>(
  communes.map((c) => [c.codeInsee, c])
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

export const hospitalBySlug = new Map<string, Hospital>(
  hospitals.filter((h) => h.slug).map((h) => [h.slug as string, h])
);

export function getCommune(departmentSlug: string, citySlug: string): Commune | null {
  return communeByKey.get(`${departmentSlug}/${citySlug}`) ?? null;
}

export function getCommuneByCodeInsee(codeInsee: string): Commune | null {
  return communeByCodeInsee.get(normalizeCodeInsee(codeInsee)) ?? null;
}

export function getNearbyHospitals(commune: Commune, limit = 6): Hospital[] {
  return (hospitalsByCommune.get(commune.codeInsee) ?? []).slice(0, limit);
}

// Distance orthodromique (formule de haversine), en km — suffisant à cette
// échelle (distances de quelques dizaines de km max), pas besoin d'une
// projection plus précise.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface NearestHospital {
  hospital: Hospital;
  distanceKm: number;
}

// Établissements les plus proches par distance réelle (pas seulement dans la
// même commune) — complète getNearbyHospitals, en particulier utile pour les
// petites communes sans établissement propre. Plafonné à maxDistanceKm pour
// éviter d'afficher un résultat absurde (ex. DROM : la conversion GPS des
// hôpitaux ne couvre que la projection Lambert-93 métropole, voir
// fetch-hospitals.mjs — sans hôpital converti à proximité réelle, mieux vaut
// une liste vide que de faire remonter un établissement à des milliers de km).
export function getNearestHospitalsByDistance(
  commune: Commune,
  limit = 4,
  { excludeSameCommune = true, maxDistanceKm = 40 } = {}
): NearestHospital[] {
  if (commune.lat == null || commune.lon == null) return [];
  const lat = commune.lat;
  const lon = commune.lon;

  return hospitals
    .filter((h) => h.lat != null && h.lon != null)
    .filter(
      (h) =>
        !excludeSameCommune ||
        (h.codeInseeCommune ? normalizeCodeInsee(h.codeInseeCommune) : null) !== commune.codeInsee
    )
    .map((h) => ({ hospital: h, distanceKm: haversineKm(lat, lon, h.lat as number, h.lon as number) }))
    .filter((x) => x.distanceKm <= maxDistanceKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function getHospital(slug: string): Hospital | null {
  return hospitalBySlug.get(slug) ?? null;
}

// Autres établissements de la même ville, pour le maillage croisé sur la
// page hôpital (exclut l'établissement courant).
export function getOtherHospitalsInCommune(hospital: Hospital, limit = 5): Hospital[] {
  if (!hospital.codeInseeCommune) return [];
  const key = normalizeCodeInsee(hospital.codeInseeCommune);
  return (hospitalsByCommune.get(key) ?? []).filter((h) => h !== hospital).slice(0, limit);
}

export function getCommunesForDepartment(departmentSlug: string): Commune[] {
  return (communesByDepartment.get(departmentSlug) ?? [])
    .slice()
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
}

// Rang de population réel de la commune dans son département (1 = la plus
// peuplée), pour un contenu vraiment différencié par ville plutôt qu'un
// texte figé — pas une statistique inventée, calculée depuis communes.json.
export function getPopulationRank(commune: Commune): { rank: number; total: number } | null {
  if (commune.population == null) return null;
  const deptCommunes = getCommunesForDepartment(commune.departementSlug);
  const rank = deptCommunes.findIndex((c) => c.codeInsee === commune.codeInsee) + 1;
  return rank > 0 ? { rank, total: deptCommunes.length } : null;
}

// Villes "voisines" au sens géographique réel (distance à vol d'oiseau depuis
// les coordonnées de fetch-communes.mjs), pas administratif : peut inclure
// une commune d'un autre département si elle est réellement plus proche que
// des communes du même département — le lien fonctionne dans tous les cas
// (params.department vient de c.departementSlug, pas du département courant).
export function getNeighboringCommunes(commune: Commune, limit = 4): Commune[] {
  if (commune.lat != null && commune.lon != null) {
    const lat = commune.lat;
    const lon = commune.lon;
    return communes
      .filter((c) => c.codeInsee !== commune.codeInsee && c.lat != null && c.lon != null)
      .map((c) => ({ commune: c, distanceKm: haversineKm(lat, lon, c.lat as number, c.lon as number) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit)
      .map((x) => x.commune);
  }

  // Repli si lat/lon absents (ne devrait plus arriver après régénération de
  // communes.json — voir ROADMAP-SEO.md) : classement par rang de population
  // dans le département, l'ancien algorithme.
  const deptCommunes = getCommunesForDepartment(commune.departementSlug);
  const index = deptCommunes.findIndex((c) => c.codeInsee === commune.codeInsee);
  if (index === -1) return [];

  const half = Math.ceil(limit / 2);
  let start = Math.max(0, index - half);
  let end = Math.min(deptCommunes.length, start + limit + 1);
  start = Math.max(0, end - (limit + 1));

  return deptCommunes.slice(start, end).filter((c) => c.codeInsee !== commune.codeInsee);
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

// Uniquement les établissements avec une page (slug présent) — pas la peine
// de faire remonter un résultat de recherche qui ne mène nulle part.
const hospitalsSearchIndex = hospitals
  .filter((h) => h.slug)
  .map((h) => ({ hospital: h, normalizedNom: normalizeQuery(h.nom) }));

export function searchHospitals(
  query: string,
  opts: { departmentSlug?: string; limit?: number } = {}
): Hospital[] {
  const { departmentSlug, limit = 8 } = opts;
  const q = normalizeQuery(query);
  if (q.length < 2) return [];

  const startsWith: Hospital[] = [];
  const includes: Hospital[] = [];
  for (const { hospital, normalizedNom } of hospitalsSearchIndex) {
    if (departmentSlug && hospital.departementSlug !== departmentSlug) continue;
    if (normalizedNom.startsWith(q)) startsWith.push(hospital);
    else if (normalizedNom.includes(q)) includes.push(hospital);
  }
  return [...startsWith, ...includes].slice(0, limit);
}
