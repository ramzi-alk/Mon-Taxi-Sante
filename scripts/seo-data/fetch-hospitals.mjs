// Génère src/data/seo/hospitals.json à partir du répertoire FINESS (Fichier
// National des Établissements Sanitaires et Sociaux), publié en open data sur
// data.gouv.fr par le ministère de la Santé.
//
// Doit être exécuté après fetch-communes.mjs : les hôpitaux sont reliés à une
// ville canonique (nom, slug, département) par recoupement du code INSEE
// commune avec src/data/seo/communes.json, plutôt que de faire confiance à un
// éventuel nom de commune présent dans l'export FINESS (souvent absent ou peu
// fiable — l'export brut n'expose que des codes).
//
// Le fichier stock FINESS commence parfois par une ligne de préambule avant
// la vraie ligne d'en-têtes ; ce script scanne les premières lignes pour la
// retrouver. Si le format change encore, relancez avec --debug pour inspecter
// les en-têtes et lignes brutes détectés.
//
// Usage :
//   node scripts/seo-data/fetch-hospitals.mjs --debug
//   node scripts/seo-data/fetch-hospitals.mjs --input=./finess.csv        (fichier déjà téléchargé)
//   node scripts/seo-data/fetch-hospitals.mjs --list                     (liste les datasets candidats sans télécharger)
//   node scripts/seo-data/fetch-hospitals.mjs --dataset=<slug-ou-id>      (cible un dataset data.gouv.fr précis)
//   node scripts/seo-data/fetch-hospitals.mjs --resource-url=<url-csv>    (télécharge directement cette URL, saute la recherche)
import { writeFile } from "node:fs/promises";
import { parseCsv, detectDelimiter } from "./csv.mjs";

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

// Motifs de correspondance pour retrouver les colonnes utiles quels que
// soient les intitulés exacts de l'export (ils varient selon les millésimes
// FINESS). Premier motif qui matche un en-tête = colonne retenue.
//
// Confirmés contre un exemple réel de l'API Explore (Opendatasoft) du jeu de
// données FINESS : nofinesset, rs, rslongue, voie, categetab, libcategetab,
// commune (code local 2-3 chiffres, PAS le nom), com_code (code INSEE complet,
// ex. "75107"), dep_code, coordxet/coordyet, telephone. Le nom de la commune
// et le code postal n'apparaissent pas forcément comme colonnes séparées
// (l'export brut ne semble exposer que des codes) — d'où le recours à
// communes.json pour résoudre le nom canonique à partir du code INSEE.
const COLUMN_PATTERNS = {
  finess: [/^nofinesset$/i, /^nofiness/i, /finess/i],
  nom: [/^rslongue$/i, /^rs$/i, /raisonsociale/i, /^nomcourt$/i, /^nom$/i],
  categorie: [/^libcategetab$/i, /libcategagretab/i, /categorie/i],
  voie: [/^voie$/i, /adresse/i, /^address$/i],
  codePostal: [/codepostal/i, /^cp$/i],
  // ATTENTION : ne pas matcher `/^commune$/i` ici — dans l'export FINESS ce
  // champ est un code local (ex. "107"), pas un nom de ville.
  communeNom: [/^com_name$/i, /^libcommune$/i, /^ville$/i],
  codeInseeCommune: [/^com_code$/i, /^codecommune$/i, /^inseecommune$/i, /^codeinsee$/i],
  // Code département (2 car., ou 3 pour les DROM) + code commune local (le
  // champ `commune` lui-même) : permet de reconstruire le code INSEE complet
  // quand aucune colonne `com_code`/`codecommune` n'est présente.
  depCode: [/^dep_code$/i, /^departement$/i, /^coddep$/i],
  depNom: [/^dep_name$/i, /^libdepartement$/i],
  communeLocalCode: [/^commune$/i],
  lat: [/^coordyet$/i, /^latitude$/i, /^lat$/i],
  lon: [/^coordxet$/i, /^longitude$/i, /^lon(g)?$/i],
  telephone: [/^telephone$/i, /^tel$/i],
};

function findColumnIndex(headers, patterns) {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim()));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Certains exports gouvernementaux commencent par une ligne de préambule
// (date de génération, métadonnées) avant la vraie ligne d'en-têtes. On
// scanne les premières lignes pour trouver celle qui ressemble vraiment à un
// en-tête FINESS plutôt que de supposer que c'est toujours la ligne 1.
function findHeaderRowIndex(rows) {
  const looksLikeFiness = (cell) => /^nofinesset$|^nofiness/i.test(cell.trim());
  const looksLikeName = (cell) => /^rslongue$|^rs$|raisonsociale/i.test(cell.trim());
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    if (row.some(looksLikeFiness) && row.some(looksLikeName)) {
      return i;
    }
  }
  return -1;
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

async function main() {
  const text = await loadCsvText();
  const firstLine = text.slice(0, text.indexOf("\n"));
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsv(text, delimiter);

  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx === -1) {
    console.error(
      "Impossible de repérer la ligne d'en-têtes dans les 20 premières lignes."
    );
    console.error("Premières lignes brutes :", rows.slice(0, 5));
    throw new Error(
      "Ligne d'en-têtes introuvable — le format du fichier a peut-être changé. Inspectez avec --debug."
    );
  }
  if (headerIdx > 0) {
    console.log(
      `Note : ${headerIdx} ligne(s) de préambule ignorée(s) avant la vraie ligne d'en-têtes.`
    );
  }
  const headers = rows[headerIdx].map((h) => h.trim());
  const dataRows = rows.slice(headerIdx + 1);

  if (DEBUG) {
    console.log("En-têtes détectés :", headers);
    console.log("Exemple de ligne :", dataRows[0]);
  }

  const cols = Object.fromEntries(
    Object.entries(COLUMN_PATTERNS).map(([key, patterns]) => [
      key,
      findColumnIndex(headers, patterns),
    ])
  );

  if (cols.nom === -1) {
    console.error("Colonnes détectées :", cols);
    console.error("En-têtes disponibles :", headers);
    throw new Error(
      "Colonne essentielle (nom de l'établissement) introuvable — ajustez COLUMN_PATTERNS dans ce script après inspection avec --debug."
    );
  }

  const communesIndex = await loadCommunesIndex();
  if (communesIndex.size === 0) {
    console.warn(
      "src/data/seo/communes.json introuvable ou vide : les hôpitaux ne seront pas reliés à une ville canonique (exécutez fetch-communes.mjs avant fetch-hospitals.mjs)."
    );
  }

  const get = (row, key) => (cols[key] !== -1 ? row[cols[key]]?.trim() || null : null);

  const hospitals = dataRows
    .map((r) => {
      const directCodeInsee = get(r, "codeInseeCommune");
      const codeInseeCommune =
        directCodeInsee || buildCodeInsee(get(r, "depCode"), get(r, "communeLocalCode"));
      const commune = codeInseeCommune ? communesIndex.get(codeInseeCommune) : null;

      return {
        finess: get(r, "finess"),
        nom: get(r, "nom"),
        categorie: get(r, "categorie"),
        adresse: get(r, "voie"),
        codePostal: get(r, "codePostal"),
        codeInseeCommune,
        communeNom: commune?.nom ?? get(r, "communeNom"),
        departementSlug: commune?.departementSlug ?? null,
        departementNom: commune?.departementNom ?? get(r, "depNom"),
        lat: cols.lat !== -1 ? Number(r[cols.lat]) || null : null,
        lon: cols.lon !== -1 ? Number(r[cols.lon]) || null : null,
        telephone: get(r, "telephone"),
      };
    })
    .filter((h) => h.nom)
    .filter((h) => !h.categorie || RELEVANT_CATEGORY_PATTERN.test(h.categorie));

  const linked = hospitals.filter((h) => h.departementSlug).length;

  const outPath = new URL("../../src/data/seo/hospitals.json", import.meta.url);
  await writeFile(outPath, JSON.stringify(hospitals, null, 2) + "\n");

  console.log(
    `✓ ${hospitals.length} établissements retenus sur ${dataRows.length} lignes lues (${linked} reliés à une ville de communes.json) → src/data/seo/hospitals.json`
  );
  if (hospitals.length === 0) {
    console.warn(
      "Aucun établissement retenu : relancez avec --debug et vérifiez RELEVANT_CATEGORY_PATTERN / COLUMN_PATTERNS."
    );
  }
}

main().catch((err) => {
  console.error("Échec de la génération des hôpitaux :", err.message);
  process.exitCode = 1;
});
