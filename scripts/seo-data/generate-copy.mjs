// Génère une introduction unique par ville et par ALD via l'API DeepSeek
// (endpoint compatible format Anthropic : https://api.deepseek.com/anthropic),
// pour différencier le texte visible au-delà des données déjà utilisées
// (rang de population, villes voisines — voir seoData.ts). Nécessite un accès
// réseau réel et la variable d'environnement DEEPSEEK_API_KEY.
//
// Résultat écrit dans src/data/seo/city-copy.json et src/data/seo/ald-copy.json
// (clé = codeInsee / slug ALD, valeur = texte). Ces fichiers sont commités et
// lus au build (voir seoData.ts / aldData.ts) — à relire avant de merger (voir
// ROADMAP-SEO.md, Sprint 5) : le texte reste piloté par prompt, une relecture
// même partielle reste utile avant publication large.
//
// Usage :
//   DEEPSEEK_API_KEY=sk-xxx node scripts/seo-data/generate-copy.mjs
//   node scripts/seo-data/generate-copy.mjs --only=maladies
//   node scripts/seo-data/generate-copy.mjs --only=villes --limit=20   (échantillon)
//   node scripts/seo-data/generate-copy.mjs --force                    (régénère tout)
//   node scripts/seo-data/generate-copy.mjs --concurrency=4
import { readFile, writeFile } from "node:fs/promises";

const API_URL = "https://api.deepseek.com/anthropic/v1/messages";
const MODEL = "deepseek-v4-pro";
const API_KEY = process.env.DEEPSEEK_API_KEY;

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="))?.split("=")[1];
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const LIMIT = limitArg ? Number(limitArg) : Infinity;
const FORCE = args.includes("--force");
const CONCURRENCY = Number(
  args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? 8
);

// Prompt système fixe et identique à chaque appel : sur un endpoint qui met
// en cache le préfixe répété (voir tarification DeepSeek, "cache hit" vs
// "cache miss"), ça maximise les chances que ce bloc soit facturé au tarif
// réduit sur l'ensemble des ~5500 appels.
const SYSTEM_PROMPT = `Tu rédiges de courtes introductions pour un site de taxi médical conventionné par l'Assurance Maladie (Mon Taxi Santé), pour des pages locales SEO.

Règles strictes :
- 2 à 3 phrases, 45 à 70 mots, en français, vouvoiement.
- N'utilise QUE les faits fournis dans le message utilisateur ; n'invente aucun chiffre, aucun établissement, aucune statistique absente de ces données.
- Ton informatif et rassurant, jamais promotionnel à l'excès (pas de "meilleur", "numéro 1", "leader").
- Varie la structure des phrases d'un texte à l'autre, ne répète pas une formule figée.
- Réponds UNIQUEMENT avec le texte de l'introduction : pas de titre, pas de guillemets, pas de markdown, pas de préambule.`;

function buildCityPrompt(commune, { hospitalCount, rank, totalInDept, neighborNames }) {
  const lines = [
    `Ville : ${commune.nom}`,
    `Département : ${commune.departementNom} (${commune.codeDepartement})`,
  ];
  if (commune.population) {
    lines.push(`Population : ${commune.population.toLocaleString("fr-FR")} habitants`);
  }
  if (rank) {
    lines.push(`Rang de population dans le département : ${rank}e sur ${totalInDept}`);
  }
  lines.push(`Nombre d'établissements de santé recensés dans la ville : ${hospitalCount}`);
  if (neighborNames.length) {
    lines.push(`Villes voisines dans le même département : ${neighborNames.join(", ")}`);
  }
  lines.push("", "Rédige l'introduction de la page de cette ville.");
  return lines.join("\n");
}

function buildAldPrompt(ald) {
  return [
    `Affection de longue durée (ALD) n°${ald.numero} : ${ald.nom}`,
    `Soins associés généralement pris en charge : ${ald.soinsAssocies}`,
    "",
    "Rédige l'introduction de la page de cette ALD (contexte : transport médical vers ces soins, pris en charge à 100% sur prescription médicale de transport).",
  ].join("\n");
}

async function callDeepSeek(userPrompt, { retries = 3 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          // deepseek-v4-pro raisonne avant de répondre et renvoie un bloc
          // "thinking" en premier dans content[] (voir plus bas, on l'ignore
          // et on cherche le bloc "text") : la longueur du raisonnement varie
          // beaucoup d'un prompt à l'autre, donc une marge large est
          // nécessaire pour ne jamais couper le texte final avant la fin.
          max_tokens: 3000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`DeepSeek a répondu ${res.status} : ${body.slice(0, 300)}`);
      }
      const data = await res.json();
      // stop_reason "max_tokens" signifie que la réponse a été coupée avant
      // la fin (vu en pratique : un texte tronqué en plein mot, ex. "Mon
      // Tax") — on la rejette explicitement plutôt que d'écrire un texte
      // incomplet dans le JSON final.
      if (data.stop_reason === "max_tokens") {
        throw new Error(
          `Réponse tronquée (max_tokens atteint) : ${JSON.stringify(data).slice(0, 500)}`
        );
      }
      const text = data.content?.find((block) => block.type === "text")?.text?.trim();
      if (!text) {
        throw new Error(
          `Réponse vide ou format inattendu : ${JSON.stringify(data).slice(0, 500)}`
        );
      }
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = 1000 * 2 ** (attempt - 1);
      console.warn(`  retry ${attempt}/${retries} après erreur (${err.message}) — attente ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// Petit pool de concurrence maison (pas besoin d'une dépendance externe pour
// borner à N requêtes en vol simultanément).
async function runPool(items, worker, concurrency) {
  let index = 0;
  let done = 0;
  async function next() {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]);
      done++;
      if (done % 25 === 0 || done === items.length) {
        console.log(`  ${done}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

async function loadJsonIfExists(url) {
  try {
    return JSON.parse(await readFile(url));
  } catch {
    return {};
  }
}

async function generateAldCopy() {
  const aldList = JSON.parse(
    await readFile(new URL("../../src/data/seo/ald.json", import.meta.url))
  );
  const outUrl = new URL("../../src/data/seo/ald-copy.json", import.meta.url);
  const existing = FORCE ? {} : await loadJsonIfExists(outUrl);

  const todo = aldList.filter((a) => FORCE || !existing[a.slug]).slice(0, LIMIT);
  console.log(`ALD à générer : ${todo.length} (déjà faites : ${aldList.length - todo.length})`);

  await runPool(
    todo,
    async (ald) => {
      try {
        existing[ald.slug] = await callDeepSeek(buildAldPrompt(ald));
      } catch (err) {
        console.error(`  échec pour ${ald.nomCourt} : ${err.message}`);
      }
    },
    CONCURRENCY
  );

  await writeFile(outUrl, JSON.stringify(existing, null, 2) + "\n");
  console.log(`✓ ${Object.keys(existing).length} intros ALD écrites dans src/data/seo/ald-copy.json`);
}

async function generateCityCopy() {
  const communes = JSON.parse(
    await readFile(new URL("../../src/data/seo/communes.json", import.meta.url))
  );
  const hospitals = JSON.parse(
    await readFile(new URL("../../src/data/seo/hospitals.json", import.meta.url))
  );

  const hospitalCountByCommune = new Map();
  for (const h of hospitals) {
    if (!h.codeInseeCommune) continue;
    hospitalCountByCommune.set(
      h.codeInseeCommune,
      (hospitalCountByCommune.get(h.codeInseeCommune) ?? 0) + 1
    );
  }

  const byDept = new Map();
  for (const c of communes) {
    const list = byDept.get(c.departementSlug) ?? [];
    list.push(c);
    byDept.set(c.departementSlug, list);
  }
  for (const list of byDept.values()) {
    list.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  }

  const outUrl = new URL("../../src/data/seo/city-copy.json", import.meta.url);
  const existing = FORCE ? {} : await loadJsonIfExists(outUrl);

  const todo = communes.filter((c) => FORCE || !existing[c.codeInsee]).slice(0, LIMIT);
  console.log(`Villes à générer : ${todo.length} (déjà faites : ${communes.length - todo.length})`);

  let sinceLastSave = 0;
  await runPool(
    todo,
    async (commune) => {
      const deptCommunes = byDept.get(commune.departementSlug) ?? [];
      const rankIndex = deptCommunes.findIndex((c) => c.codeInsee === commune.codeInsee);
      const rank = rankIndex >= 0 ? rankIndex + 1 : null;
      const neighborNames = deptCommunes
        .slice(Math.max(0, rankIndex - 2), rankIndex + 3)
        .filter((c) => c.codeInsee !== commune.codeInsee)
        .map((c) => c.nom);

      const prompt = buildCityPrompt(commune, {
        hospitalCount: hospitalCountByCommune.get(commune.codeInsee) ?? 0,
        rank,
        totalInDept: deptCommunes.length,
        neighborNames,
      });

      try {
        existing[commune.codeInsee] = await callDeepSeek(prompt);
      } catch (err) {
        console.error(`  échec pour ${commune.nom} (${commune.codeInsee}) : ${err.message}`);
      }

      // Sauvegarde incrémentale : sur ~5500 appels, une interruption ne doit
      // pas faire perdre le travail déjà fait (relançable sans --force).
      if (++sinceLastSave >= 50) {
        sinceLastSave = 0;
        await writeFile(outUrl, JSON.stringify(existing, null, 2) + "\n");
      }
    },
    CONCURRENCY
  );

  await writeFile(outUrl, JSON.stringify(existing, null, 2) + "\n");
  console.log(`✓ ${Object.keys(existing).length} intros ville écrites dans src/data/seo/city-copy.json`);
}

async function main() {
  if (!API_KEY) {
    throw new Error(
      "DEEPSEEK_API_KEY manquante. Définissez la variable d'environnement avant de lancer ce script."
    );
  }

  if (!onlyArg || onlyArg === "maladies") await generateAldCopy();
  if (!onlyArg || onlyArg === "villes") await generateCityCopy();
}

main().catch((err) => {
  console.error("Échec de la génération de contenu :", err.message);
  process.exitCode = 1;
});
