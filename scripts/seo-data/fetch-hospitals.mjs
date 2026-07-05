// Génère src/data/seo/hospitals.json à partir du répertoire FINESS (Fichier
// National des Établissements Sanitaires et Sociaux), publié en open data sur
// data.gouv.fr par le ministère de la Santé.
//
// ⚠️ Contrairement à fetch-communes.mjs (API stable geo.api.gouv.fr), le jeu de
// données FINESS sur data.gouv.fr change parfois de slug/format d'une mise à
// jour à l'autre, et ce script n'a pas pu être testé contre le réseau réel
// dans l'environnement où il a été écrit (accès sortant restreint). Avant de
// l'intégrer à un cron CI, exécutez-le une fois avec --debug pour vérifier
// que les colonnes détectées correspondent bien aux en-têtes réels du CSV, et
// ajustez les motifs de COLUMN_PATTERNS si besoin.
//
// Usage :
//   node scripts/seo-data/fetch-hospitals.mjs --debug
//   node scripts/seo-data/fetch-hospitals.mjs --input=./finess.csv   (fichier déjà téléchargé)
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
  "https://www.data.gouv.fr/api/1/datasets/?q=finess%20etablissements&page_size=5";

// Catégories FINESS pertinentes pour du transport sanitaire (hôpitaux,
// cliniques, centres de dialyse...). On filtre sur le libellé plutôt que sur
// le code numérique de catégorie : plus robuste sans avoir pu vérifier la
// table de correspondance exacte en conditions réelles.
const RELEVANT_CATEGORY_PATTERN =
  /hopital|hôpital|hopitaux|chu|chr\b|centre hospitalier|clinique|dialyse|had\b|maison de sant/i;

// Motifs de correspondance pour retrouver les colonnes utiles quels que
// soient les intitulés exacts de l'export (ils varient selon les millésimes
// FINESS). Premier motif qui matche un en-tête = colonne retenue.
const COLUMN_PATTERNS = {
  finess: [/^nofinesset/i, /^nofiness/i, /finess/i],
  nom: [/^rslongue/i, /^rs$/i, /raisonsociale/i, /^nomcourt/i, /^nom$/i],
  categorie: [/libcategetab/i, /libcategagretab/i, /categorie/i],
  voie: [/^voie/i, /adresse/i],
  codePostal: [/codepostal/i, /^cp$/i],
  communeNom: [/libcommune/i, /^commune$/i, /ville/i],
  codeInseeCommune: [/codecommune/i, /inseecommune/i],
  lat: [/coordyet/i, /^latitude/i, /^lat$/i],
  lon: [/coordxet/i, /^longitude/i, /^lon(g)?$/i],
  telephone: [/^telephone/i, /^tel$/i],
};

function findColumnIndex(headers, patterns) {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim()));
    if (idx !== -1) return idx;
  }
  return -1;
}

async function resolveCsvUrl() {
  console.log(`Recherche du jeu de données FINESS sur data.gouv.fr ...`);
  const res = await fetch(DATASET_SEARCH_URL);
  if (!res.ok) {
    throw new Error(`data.gouv.fr a répondu ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const dataset = data.data?.[0];
  if (!dataset) {
    throw new Error(
      "Aucun jeu de données FINESS trouvé via l'API de recherche data.gouv.fr."
    );
  }
  const resource = dataset.resources?.find(
    (r) => r.format?.toLowerCase() === "csv"
  );
  if (!resource) {
    throw new Error(
      `Le dataset "${dataset.title}" ne contient pas de ressource CSV directement exploitable.`
    );
  }
  console.log(`Dataset trouvé : "${dataset.title}" → ${resource.url}`);
  return resource.url;
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

async function main() {
  const text = await loadCsvText();
  const firstLine = text.slice(0, text.indexOf("\n"));
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCsv(text, delimiter);
  const headers = rows[0].map((h) => h.trim());

  if (DEBUG) {
    console.log("En-têtes détectés :", headers);
    console.log("Exemple de ligne :", rows[1]);
  }

  const cols = Object.fromEntries(
    Object.entries(COLUMN_PATTERNS).map(([key, patterns]) => [
      key,
      findColumnIndex(headers, patterns),
    ])
  );

  if (cols.nom === -1 || cols.communeNom === -1) {
    console.error("Colonnes détectées :", cols);
    console.error("En-têtes disponibles :", headers);
    throw new Error(
      "Colonnes essentielles (nom / commune) introuvables — ajustez COLUMN_PATTERNS dans ce script après inspection avec --debug."
    );
  }

  const hospitals = rows
    .slice(1)
    .map((r) => ({
      finess: cols.finess !== -1 ? r[cols.finess]?.trim() : null,
      nom: r[cols.nom]?.trim(),
      categorie: cols.categorie !== -1 ? r[cols.categorie]?.trim() : null,
      adresse: cols.voie !== -1 ? r[cols.voie]?.trim() : null,
      codePostal: cols.codePostal !== -1 ? r[cols.codePostal]?.trim() : null,
      communeNom: r[cols.communeNom]?.trim(),
      codeInseeCommune:
        cols.codeInseeCommune !== -1 ? r[cols.codeInseeCommune]?.trim() : null,
      lat: cols.lat !== -1 ? Number(r[cols.lat]) || null : null,
      lon: cols.lon !== -1 ? Number(r[cols.lon]) || null : null,
      telephone: cols.telephone !== -1 ? r[cols.telephone]?.trim() : null,
    }))
    .filter((h) => h.nom && h.communeNom)
    .filter((h) => !h.categorie || RELEVANT_CATEGORY_PATTERN.test(h.categorie));

  const outPath = new URL("../../src/data/seo/hospitals.json", import.meta.url);
  await writeFile(outPath, JSON.stringify(hospitals, null, 2) + "\n");

  console.log(
    `✓ ${hospitals.length} établissements retenus sur ${rows.length - 1} lignes lues → src/data/seo/hospitals.json`
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
