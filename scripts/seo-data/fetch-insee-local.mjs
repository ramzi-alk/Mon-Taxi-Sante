// Script de DÉCOUVERTE (pas encore un vrai parseur) pour des données
// socio-économiques INSEE par commune (revenu médian, pauvreté...) — objectif
// : enrichir le contenu par ville (Sprint 5, generate-copy.mjs) au-delà de la
// population déjà utilisée. Cible probable : le fichier FILOSOFI (Fichier
// localisé social et fiscal), publié par l'INSEE au niveau communal,
// généralement disponible en CSV sur data.gouv.fr.
//
// Comme pour la SAE, pas de structure de colonnes connue avec confiance ici :
// ce script sert à découvrir le vrai dataset avant d'écrire l'extraction.
// La jointure elle-même sera triviale (même code INSEE que communes.json)
// une fois la structure du fichier confirmée.
//
// Usage :
//   node scripts/seo-data/fetch-insee-local.mjs --list
//   node scripts/seo-data/fetch-insee-local.mjs --list --query="filosofi"    (surcharge les mots-clés de recherche)
//   node scripts/seo-data/fetch-insee-local.mjs --dataset=<slug-ou-id>            (liste les ressources)
//   node scripts/seo-data/fetch-insee-local.mjs --resource-url=<url> --debug      (télécharge et affiche la structure réelle)
import { parseCsv, detectDelimiter } from "./csv.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const DEFAULT_QUERY = "filosofi revenus pauvrete niveau de vie communes";
const DATASET_SEARCH_URL = `https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(
  typeof args.query === "string" ? args.query : DEFAULT_QUERY
)}&page_size=20`;

function scoreDataset(dataset) {
  const title = dataset.title.toLowerCase();
  const org = (dataset.organization?.name ?? "").toLowerCase();
  let score = 0;
  if (/filosofi/.test(title)) score += 10;
  if (/revenu|pauvret|niveau de vie/.test(title)) score += 5;
  if (/commune/.test(title)) score += 5;
  if (/insee/.test(org) || /insee/.test(title)) score += 5;
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
    console.log("Recherche de datasets INSEE (revenu/pauvreté par commune) sur data.gouv.fr ...");
    const candidates = await searchCandidates();
    if (candidates.length === 0) {
      console.log(
        "Aucun résultat. Cherchez manuellement sur https://www.data.gouv.fr (organisation INSEE, mot-clé FILOSOFI) et relancez avec --dataset=<slug>."
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
      "\nChoisissez la ressource au niveau communal (pas régional/départemental) puis relancez avec --resource-url=<url> --debug."
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
      "\nChercher dans les en-têtes ci-dessus une colonne de code INSEE commune et une colonne de revenu médian/taux de pauvreté."
    );
    return;
  }

  console.log(
    "Aucune action demandée. Utilisez --list, --dataset=<slug>, ou --resource-url=<url> --debug (voir en-tête du script)."
  );
}

main().catch((err) => {
  console.error("Échec de la découverte INSEE :", err.message);
  process.exitCode = 1;
});
