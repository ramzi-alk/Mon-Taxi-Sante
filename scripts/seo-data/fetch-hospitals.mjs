// Génère src/data/seo/hospitals.json à partir du répertoire FINESS (Fichier
// National des Établissements Sanitaires et Sociaux), publié en open data sur
// data.gouv.fr par le ministère de la Santé.
//
// Doit être exécuté après fetch-communes.mjs : les hôpitaux sont reliés à une
// ville canonique (nom, slug, département) par recoupement du code INSEE
// commune avec src/data/seo/communes.json, plutôt que de faire confiance au
// nom de commune de l'export FINESS (abîmé par la casse/ponctuation "CEDEX",
// et de toute façon absent en tant que colonne séparée — voir ci-dessous).
//
// Le fichier "stock" FINESS (etalab-cs1100507-stock-*.csv) n'a PAS de vraie
// ligne d'en-têtes : la ligne 1 est un manifeste ("finess;etalab;98;date"),
// et chaque ligne de données démarre par une étiquette de type
// d'enregistrement (plusieurs schémas positionnels différents cohabitent
// dans le même fichier — voir STRUCTUREET_COLS). Ce script détecte d'abord
// une éventuelle vraie ligne d'en-têtes (au cas où un export différent en
// fournirait une, ex. --input= d'un CSV exporté depuis la console Explore
// Opendatasoft) et retombe sinon sur le format positionnel confirmé en
// production. Si le format change encore, relancez avec --debug.
//
// Usage :
//   node scripts/seo-data/fetch-hospitals.mjs --debug
//   node scripts/seo-data/fetch-hospitals.mjs --input=./finess.csv        (fichier déjà téléchargé)
//   node scripts/seo-data/fetch-hospitals.mjs --list                     (liste les datasets candidats sans télécharger)
//   node scripts/seo-data/fetch-hospitals.mjs --dataset=<slug-ou-id>      (cible un dataset data.gouv.fr précis)
//   node scripts/seo-data/fetch-hospitals.mjs --resource-url=<url-csv>    (télécharge directement cette URL, saute la recherche)
import { writeFile } from "node:fs/promises";
import { parseCsv, detectDelimiter } from "./csv.mjs";
import { slugify } from "./slug.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const DEBUG = Boolean(args.debug);

const DATASET_SEARCH_URL =
  "https://www.data.gouv.fr/api/1/datasets/?q=finess&page_size=20";

// La recherche data.gouv.fr remonte aussi bien l'extraction nationale
// officielle que des ré-exports régionaux ou personnels (ex. "Carte
// Etablissements FINESS 76 dec2025" — un seul département). On score les
// candidats pour préférer le fichier national complet, mais ça reste
// heuristique : utilisez --list pour vérifier, ou --dataset=/--resource-url=
// pour forcer un choix précis une fois le bon dataset identifié manuellement
// sur data.gouv.fr.
function scoreDataset(dataset, csvResource) {
  const title = dataset.title.toLowerCase();
  let score = 0;
  if (/\bfiness\b/.test(title)) score += 10;
  if (/extraction|national|fichier des .{0,20}etablissements/.test(title)) {
    score += 5;
  }
  // Un code département/région isolé dans le titre ("FINESS 76", "FINESS - 44")
  // signale presque toujours un extrait régional, pas le fichier national.
  if (/\b\d{2,3}\b/.test(title)) score -= 20;
  if (/carte|visualisation|export perso/.test(title)) score -= 10;
  // Départage par taille : le fichier national est nettement plus volumineux
  // qu'un extrait régional.
  score += Math.log10((csvResource.filesize || 1) + 1);
  return score;
}

function findCsvResource(dataset) {
  return dataset.resources?.find((r) => {
    const format = r.format?.toLowerCase() ?? "";
    return format === "csv" || format.includes("csv") || /\.csv($|\?)/i.test(r.url ?? "");
  });
}

// Catégories FINESS pertinentes pour du transport sanitaire (hôpitaux,
// cliniques, centres de dialyse...). On filtre sur le libellé plutôt que sur
// le code numérique de catégorie : plus robuste sans avoir pu vérifier la
// table de correspondance exacte en conditions réelles.
const RELEVANT_CATEGORY_PATTERN =
  /hopital|hôpital|hopitaux|chu|chr\b|centre hospitalier|clinique|dialyse|had\b|maison de sant/i;

// Le fichier "stock" FINESS (etalab-cs1100507-stock-*.csv) n'a PAS de ligne
// d'en-têtes : la ligne 1 est un manifeste ("finess;etalab;98;2026-05-12"),
// et chaque ligne de données commence par une étiquette de type
// d'enregistrement — plusieurs schémas positionnels différents sont
// concaténés dans le même fichier. Le type qui nous intéresse (identité,
// adresse, catégorie de l'établissement) est "structureet". Positions
// confirmées sur un run réel (voir commit history) :
const STRUCTUREET_TYPE = "structureet";
const STRUCTUREET_COLS = {
  finess: 1,
  rs: 3,
  rslongue: 4,
  numvoie: 7,
  typvoie: 8,
  voie: 9,
  communeLocal: 12,
  depCode: 13,
  depNom: 14,
  ligneAcheminement: 15,
  telephone: 16,
  categetab: 18,
  libcategetab: 19,
};

// Type d'enregistrement portant la géolocalisation dans le même fichier
// stock FINESS (structureet n'a pas de coordonnées, voir plus haut). Position
// des colonnes lat/lon NON confirmée en conditions réelles (contrairement à
// STRUCTUREET_COLS) : cet environnement n'a pas d'accès réseau pour tester
// sur le fichier réel (voir en-tête du script). Repli volontairement en
// scan heuristique (cherche une paire de nombres plausibles pour des
// coordonnées en France métropolitaine) plutôt qu'un index figé au hasard —
// à remplacer par des indices fixes dès qu'un run réel (--debug) confirme le
// format, comme ça a été fait pour STRUCTUREET_COLS.
const GEOLOCALISATIONET_TYPE = "geolocalisationet";
const FRANCE_LAT_RANGE = [41, 51.5];
const FRANCE_LON_RANGE = [-5.5, 10];

function looksLikeCoord(value, [min, max]) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

function extractCoordsFromGeolocalisationRow(row) {
  for (let i = 0; i < row.length - 1; i++) {
    const a = row[i]?.trim();
    const b = row[i + 1]?.trim();
    if (!a || !b) continue;
    if (looksLikeCoord(a, FRANCE_LAT_RANGE) && looksLikeCoord(b, FRANCE_LON_RANGE)) {
      return { lat: Number(a), lon: Number(b) };
    }
    if (looksLikeCoord(a, FRANCE_LON_RANGE) && looksLikeCoord(b, FRANCE_LAT_RANGE)) {
      return { lat: Number(b), lon: Number(a) };
    }
  }
  return { lat: null, lon: null };
}

// FINESS supposé en colonne 1, comme pour structureet (même convention de
// fichier) — à confirmer avec --debug également.
function buildCoordsByFiness(rows) {
  const geoRows = rows.filter((r) => r[0] === GEOLOCALISATIONET_TYPE);
  const coordsByFiness = new Map();
  for (const row of geoRows) {
    const finess = row[1]?.trim();
    if (!finess) continue;
    const coords = extractCoordsFromGeolocalisationRow(row);
    if (coords.lat != null && coords.lon != null) {
      coordsByFiness.set(finess, coords);
    }
  }
  return { geoRows, coordsByFiness };
}

// Repli si --input pointe vers un CSV différent qui, lui, a une vraie ligne
// d'en-têtes (ex. export manuel depuis la console Explore Opendatasoft).
const HEADER_COLUMN_PATTERNS = {
  finess: [/^nofinesset$/i, /^nofiness/i, /finess/i],
  nom: [/^rslongue$/i, /^rs$/i, /raisonsociale/i, /^nomcourt$/i, /^nom$/i],
  categorie: [/^libcategetab$/i, /libcategagretab/i, /categorie/i],
  voie: [/^voie$/i, /adresse/i, /^address$/i],
  communeNom: [/^com_name$/i, /^libcommune$/i, /^ville$/i],
  codeInseeCommune: [/^com_code$/i, /^codecommune$/i, /^inseecommune$/i, /^codeinsee$/i],
  depCode: [/^dep_code$/i, /^departement$/i, /^coddep$/i],
  depNom: [/^dep_name$/i, /^libdepartement$/i],
  communeLocalCode: [/^commune$/i],
  telephone: [/^telephone$/i, /^tel$/i],
  latitude: [/^latitude$/i, /^lat$/i, /^y_?wgs84$/i],
  longitude: [/^longitude$/i, /^lon$/i, /^lng$/i, /^x_?wgs84$/i],
};

function findColumnIndex(headers, patterns) {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function looksLikeHeaderRow(row) {
  const looksLikeFiness = (cell) => /^nofinesset$|^nofiness/i.test(cell.trim());
  const looksLikeName = (cell) => /^rslongue$|^rs$|raisonsociale/i.test(cell.trim());
  return row.some(looksLikeFiness) && row.some(looksLikeName);
}

// Extrait code postal + nom de commune brut d'un champ "ligne d'acheminement"
// type "01440 VIRIAT" (postal + ville, format La Poste utilisé par FINESS en
// l'absence de colonnes séparées).
function parseLigneAcheminement(value) {
  if (!value) return { codePostal: null, communeNomBrut: null };
  const match = value.trim().match(/^(\d{5})\s+(.+)$/);
  if (!match) return { codePostal: null, communeNomBrut: value.trim() || null };
  return { codePostal: match[1], communeNomBrut: match[2] };
}

// Reconstruit le code INSEE (5 caractères) à partir du code département et du
// code commune local, quand aucune colonne "code INSEE complet" n'est fournie
// directement. Ex. dep "75" + commune "107" -> "75107" ; dep "974" (DROM) +
// commune "11" -> "97411".
function buildCodeInsee(depCode, communeLocal) {
  if (!depCode || !communeLocal) return null;
  const dep = depCode.trim().toUpperCase();
  const localLength = 5 - dep.length;
  if (localLength < 2) return null;
  return dep + communeLocal.trim().padStart(localLength, "0");
}

// Paris/Lyon/Marseille sont découpées en arrondissements dans FINESS (codes
// INSEE 75101-75120, 69381-69389, 13201-13216) mais en une seule commune
// côté geo.api.gouv.fr (75056, 69123, 13055). Sans ce repli, ces hôpitaux ne
// se relient à aucune ville de communes.json (departementSlug resterait
// null) — même logique que normalizeCodeInsee() dans src/lib/seoData.ts,
// dupliquée ici car ce script tourne indépendamment du bundle applicatif.
function normalizeArrondissement(codeInsee) {
  const n = Number(codeInsee);
  if (codeInsee.startsWith("751") && n >= 75101 && n <= 75120) return "75056";
  if (codeInsee.startsWith("693") && n >= 69381 && n <= 69389) return "69123";
  if (codeInsee.startsWith("132") && n >= 13201 && n <= 13216) return "13055";
  return codeInsee;
}

async function fetchDataset(idOrSlug) {
  const res = await fetch(
    `https://www.data.gouv.fr/api/1/datasets/${idOrSlug}/`
  );
  if (!res.ok) return null;
  return res.json();
}

async function searchCandidates() {
  const res = await fetch(DATASET_SEARCH_URL);
  if (!res.ok) {
    throw new Error(`data.gouv.fr a répondu ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return (data.data ?? [])
    .map((dataset) => {
      const csvResource = findCsvResource(dataset);
      return csvResource ? { dataset, csvResource, score: scoreDataset(dataset, csvResource) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

async function resolveCsvUrl() {
  if (args["resource-url"]) {
    console.log(`URL de ressource forcée : ${args["resource-url"]}`);
    return args["resource-url"];
  }

  if (args.dataset) {
    console.log(`Dataset forcé : ${args.dataset}`);
    const dataset = await fetchDataset(args.dataset);
    if (!dataset) {
      throw new Error(`Dataset "${args.dataset}" introuvable sur data.gouv.fr.`);
    }
    const resource = findCsvResource(dataset);
    if (!resource) {
      throw new Error(
        `Le dataset "${dataset.title}" ne contient pas de ressource CSV directement exploitable.`
      );
    }
    console.log(`→ ${resource.url}`);
    return resource.url;
  }

  console.log(`Recherche du jeu de données FINESS sur data.gouv.fr ...`);
  const candidates = await searchCandidates();

  if (candidates.length === 0) {
    throw new Error(
      "Aucun dataset FINESS avec une ressource CSV trouvé via l'API de recherche data.gouv.fr. Cherchez manuellement sur https://www.data.gouv.fr et relancez avec --dataset=<slug> ou --resource-url=<url>."
    );
  }

  if (args.list) {
    console.log("Datasets candidats (du plus au moins probable) :");
    for (const { dataset, csvResource, score } of candidates) {
      console.log(
        `  [score ${score.toFixed(1)}] "${dataset.title}" (${dataset.slug || dataset.id}) → ${csvResource.url} (${csvResource.filesize ?? "?"} octets)`
      );
    }
    process.exit(0);
  }

  const best = candidates[0];
  console.log(
    `Dataset retenu : "${best.dataset.title}" (score ${best.score.toFixed(1)}) → ${best.csvResource.url}`
  );
  if (candidates.length > 1) {
    console.log(
      `(${candidates.length - 1} autre(s) candidat(s) ignoré(s) — relancez avec --list pour les voir, ou --dataset=<slug> pour forcer un choix précis.)`
    );
  }
  return best.csvResource.url;
}

async function loadCsvText() {
  if (args.input) {
    console.log(`Lecture du CSV local : ${args.input}`);
    const { readFile } = await import("node:fs/promises");
    return readFile(args.input, "utf-8");
  }
  const url = await resolveCsvUrl();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement du CSV FINESS échoué : ${res.status}`);
  }
  return res.text();
}

async function loadCommunesIndex() {
  try {
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(
      new URL("../../src/data/seo/communes.json", import.meta.url),
      "utf-8"
    );
    const communes = JSON.parse(raw);
    return new Map(communes.map((c) => [c.codeInsee, c]));
  } catch {
    return new Map();
  }
}

function extractFromStructureetRows(rows, coordsByFiness) {
  const structureRows = rows.filter((r) => r[0] === STRUCTUREET_TYPE);
  if (DEBUG) {
    const otherTypes = new Set(
      rows.filter((r) => r[0] !== STRUCTUREET_TYPE).map((r) => r[0])
    );
    console.log(
      `${structureRows.length} lignes "${STRUCTUREET_TYPE}" trouvées sur ${rows.length} lignes totales.`
    );
    console.log("Autres types d'enregistrement rencontrés :", [...otherTypes]);
    console.log("Exemple de ligne structureet :", structureRows[0]);
    // Un exemple par autre type rencontré : sert à repérer, au prochain run
    // réel, si des champs comme capacité/urgences/site web existent ailleurs
    // dans le fichier (voir ROADMAP-SEO.md) avant d'en deviner la position.
    for (const type of otherTypes) {
      console.log(`Exemple de ligne "${type}" :`, rows.find((r) => r[0] === type));
    }
  }
  return structureRows.map((r) => {
    const c = STRUCTUREET_COLS;
    const adresse = [r[c.numvoie], r[c.typvoie], r[c.voie]]
      .map((v) => v?.trim())
      .filter(Boolean)
      .join(" ") || null;
    const { codePostal, communeNomBrut } = parseLigneAcheminement(r[c.ligneAcheminement]);
    const finess = r[c.finess]?.trim() || null;
    const coords = (finess && coordsByFiness.get(finess)) || { lat: null, lon: null };
    return {
      finess,
      nom: r[c.rslongue]?.trim() || r[c.rs]?.trim() || null,
      categorie: r[c.libcategetab]?.trim() || null,
      adresse,
      codePostal,
      depCode: r[c.depCode]?.trim() || null,
      depNom: r[c.depNom]?.trim() || null,
      communeLocal: r[c.communeLocal]?.trim() || null,
      communeNomBrut,
      telephone: r[c.telephone]?.trim() || null,
      lat: coords.lat,
      lon: coords.lon,
    };
  });
}

function extractFromHeaderedRows(rows, headerIdx) {
  const headers = rows[headerIdx].map((h) => h.trim());
  const dataRows = rows.slice(headerIdx + 1);
  const cols = Object.fromEntries(
    Object.entries(HEADER_COLUMN_PATTERNS).map(([key, patterns]) => [
      key,
      findColumnIndex(headers, patterns),
    ])
  );
  if (DEBUG) {
    console.log("En-têtes détectés :", headers);
    console.log("Exemple de ligne :", dataRows[0]);
  }
  if (cols.nom === -1) {
    console.error("Colonnes détectées :", cols);
    console.error("En-têtes disponibles :", headers);
    throw new Error(
      "Colonne essentielle (nom de l'établissement) introuvable — ajustez HEADER_COLUMN_PATTERNS après inspection avec --debug."
    );
  }
  const get = (row, key) => (cols[key] !== -1 ? row[cols[key]]?.trim() || null : null);
  const getFloat = (row, key) => {
    const raw = get(row, key);
    const n = raw != null ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return dataRows.map((r) => ({
    finess: get(r, "finess"),
    nom: get(r, "nom"),
    categorie: get(r, "categorie"),
    adresse: get(r, "voie"),
    codePostal: null,
    depCode: get(r, "depCode"),
    depNom: get(r, "depNom"),
    communeLocal: get(r, "communeLocalCode"),
    communeNomBrut: get(r, "communeNom"),
    telephone: get(r, "telephone"),
    lat: getFloat(r, "latitude"),
    lon: getFloat(r, "longitude"),
  }));
}

async function main() {
  const text = await loadCsvText();
  const firstLine = text.slice(0, text.indexOf("\n"));
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsv(text, delimiter);

  const headerIdx = rows.findIndex((row, i) => i < 20 && looksLikeHeaderRow(row));
  let rawRecords;
  if (headerIdx !== -1) {
    rawRecords = extractFromHeaderedRows(rows, headerIdx);
  } else {
    const { coordsByFiness } = buildCoordsByFiness(rows);
    if (DEBUG) {
      console.log(
        `${coordsByFiness.size} coordonnées "${GEOLOCALISATIONET_TYPE}" extraites (heuristique, à vérifier).`
      );
    }
    rawRecords = extractFromStructureetRows(rows, coordsByFiness);
  }

  if (rawRecords.length === 0) {
    console.error("Premières lignes brutes :", rows.slice(0, 5));
    throw new Error(
      `Aucun enregistrement exploitable trouvé (ni ligne d'en-têtes, ni ligne de type "${STRUCTUREET_TYPE}"). Le format du fichier a peut-être encore changé — inspectez avec --debug.`
    );
  }

  const communesIndex = await loadCommunesIndex();
  if (communesIndex.size === 0) {
    console.warn(
      "src/data/seo/communes.json introuvable ou vide : les hôpitaux ne seront pas reliés à une ville canonique (exécutez fetch-communes.mjs avant fetch-hospitals.mjs)."
    );
  }

  const hospitals = rawRecords
    .map((rec) => {
      const codeInseeCommune = buildCodeInsee(rec.depCode, rec.communeLocal);
      const commune = codeInseeCommune
        ? communesIndex.get(normalizeArrondissement(codeInseeCommune))
        : null;

      return {
        finess: rec.finess,
        nom: rec.nom,
        categorie: rec.categorie,
        adresse: rec.adresse,
        codePostal: rec.codePostal,
        codeInseeCommune,
        communeNom: commune?.nom ?? rec.communeNomBrut,
        departementSlug: commune?.departementSlug ?? null,
        departementNom: commune?.departementNom ?? rec.depNom,
        // Jointure heuristique depuis les lignes "geolocalisationet" (voir
        // buildCoordsByFiness) pour le chemin positionnel, colonnes
        // latitude/longitude directes pour le chemin --input à en-têtes —
        // reste null si la ligne géo correspondante est absente ou si le
        // scan heuristique n'a rien trouvé de plausible.
        lat: rec.lat ?? null,
        lon: rec.lon ?? null,
        telephone: rec.telephone,
      };
    })
    .filter((h) => h.nom)
    .filter((h) => !h.categorie || RELEVANT_CATEGORY_PATTERN.test(h.categorie));

  // Slug uniquement pour les établissements reliés à une ville connue (sinon
  // pas de page /hopitaux/$slug — voir src/routes/hopitaux.$slug.tsx). Dédup
  // par FINESS en cas de collision (même nom dans la même ville).
  const seenSlugs = new Set();
  for (const h of hospitals) {
    if (!h.departementSlug) continue;
    let slug = slugify(`${h.nom}-${h.communeNom}`);
    if (seenSlugs.has(slug)) slug = `${slug}-${h.finess}`;
    seenSlugs.add(slug);
    h.slug = slug;
  }

  const linked = hospitals.filter((h) => h.departementSlug).length;

  const outPath = new URL("../../src/data/seo/hospitals.json", import.meta.url);
  await writeFile(outPath, JSON.stringify(hospitals, null, 2) + "\n");

  console.log(
    `✓ ${hospitals.length} établissements retenus sur ${rawRecords.length} lignes lues (${linked} reliés à une ville de communes.json) → src/data/seo/hospitals.json`
  );
  if (hospitals.length === 0) {
    console.warn(
      "Aucun établissement retenu : relancez avec --debug et vérifiez RELEVANT_CATEGORY_PATTERN."
    );
  }
}

main().catch((err) => {
  console.error("Échec de la génération des hôpitaux :", err.message);
  process.exitCode = 1;
});
