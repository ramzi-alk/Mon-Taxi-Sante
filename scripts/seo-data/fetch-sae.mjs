// Script de DÉCOUVERTE (pas encore un vrai parseur) pour la SAE (Statistique
// Annuelle des Établissements de santé, DREES) — objectif : capacité en
// lits/places et activité par établissement, à croiser avec hospitals.json
// via le numéro FINESS.
//
// Contrairement à FINESS (un seul CSV nationale bien identifié), un dataset
// SAE sur data.gouv.fr regroupe typiquement PLUSIEURS ressources (une par
// "bordereau" — identification, capacités, activité... — et par année). Pas
// de format de colonnes connu avec confiance ici (contrairement aux champs
// documentés de geo.api.gouv.fr) : ce script sert donc à découvrir le vrai
// dataset et sa structure réelle (comme la découverte FINESS l'a fait en
// plusieurs runs, voir ROADMAP-SEO.md) AVANT d'écrire l'extraction.
//
// Usage :
//   node scripts/seo-data/fetch-sae.mjs --list
//   node scripts/seo-data/fetch-sae.mjs --dataset=<slug-ou-id>            (liste les ressources du dataset)
//   node scripts/seo-data/fetch-sae.mjs --resource-url=<url> --debug      (télécharge et affiche la structure réelle)
import { parseCsv, detectDelimiter } from "./csv.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const DATASET_SEARCH_URL =
  "https://www.data.gouv.fr/api/1/datasets/?q=statistique+annuelle+des+etablissements+de+sante&page_size=20";

function scoreDataset(dataset) {
  const title = dataset.title.toLowerCase();
  const org = (dataset.organization?.name ?? "").toLowerCase();
  let score = 0;
  if (/\bsae\b/.test(title)) score += 10;
  if (/statistique annuelle des .{0,15}etablissement/.test(title)) score += 10;
  if (/drees/.test(org) || /drees/.test(title)) score += 5;
  if (/région|regional|departement/.test(title)) score -= 10;
  return score;
}

async function searchCandidates() {
  const res = await fetch(DATASET_SEARCH_URL);
  if (!res.ok) throw new Error(`data.gouv.fr a répondu ${res.status} ${res.statusText}`);
  const data = await res.json();
  return (data.data ?? [])
    .map((dataset) => ({ dataset, score: scoreDataset(dataset) }))
    .sort((a, b) => b.score - a.score);
}

async function fetchDataset(idOrSlug) {
  const res = await fetch(`https://www.data.gouv.fr/api/1/datasets/${idOrSlug}/`);
  if (!res.ok) throw new Error(`Dataset "${idOrSlug}" introuvable (${res.status}).`);
  return res.json();
}

async function main() {
  if (args.list) {
    console.log("Recherche de datasets SAE sur data.gouv.fr ...");
    const candidates = await searchCandidates();
    if (candidates.length === 0) {
      console.log(
        "Aucun résultat. Cherchez manuellement sur https://www.data.gouv.fr (organisation DREES) et relancez avec --dataset=<slug>."
      );
      return;
    }
    console.log(`${candidates.length} dataset(s) candidat(s) (du plus au moins probable) :`);
    for (const { dataset, score } of candidates.slice(0, 10)) {
      console.log(
        `  [score ${score}] "${dataset.title}" (${dataset.slug || dataset.id}) — org: ${dataset.organization?.name ?? "?"}`
      );
    }
    return;
  }

  if (args.dataset) {
    const dataset = await fetchDataset(args.dataset);
    console.log(`Dataset "${dataset.title}" — ${dataset.resources?.length ?? 0} ressource(s) :`);
    for (const r of dataset.resources ?? []) {
      console.log(`  [${r.format ?? "?"}] "${r.title}" (${r.filesize ?? "?"} octets) → ${r.url}`);
    }
    console.log(
      "\nChoisissez la ressource pertinente (capacité/lits/activité) puis relancez avec --resource-url=<url> --debug."
    );
    return;
  }

  if (args["resource-url"]) {
    console.log(`Téléchargement de ${args["resource-url"]} ...`);
    const res = await fetch(args["resource-url"]);
    if (!res.ok) throw new Error(`Téléchargement échoué : ${res.status}`);
    const text = await res.text();
    const firstLine = text.slice(0, text.indexOf("\n"));
    const delimiter = detectDelimiter(firstLine);
    const rows = parseCsv(text, delimiter);
    console.log(`${rows.length} lignes lues, délimiteur détecté : "${delimiter}"`);
    console.log("Ligne d'en-têtes (supposée ligne 1) :", rows[0]);
    console.log("Exemple de ligne de données :", rows[1]);
    console.log(
      "\nChercher dans les en-têtes ci-dessus une colonne d'identifiant FINESS et une colonne de capacité (lits/places)."
    );
    return;
  }

  console.log(
    "Aucune action demandée. Utilisez --list, --dataset=<slug>, ou --resource-url=<url> --debug (voir en-tête du script)."
  );
}

main().catch((err) => {
  console.error("Échec de la découverte SAE :", err.message);
  process.exitCode = 1;
});
