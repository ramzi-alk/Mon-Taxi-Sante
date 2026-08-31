// Génère src/data/seo/communes.json à partir de l'API officielle
// https://geo.api.gouv.fr (Base Adresse Nationale / IGN, domaine public, gratuit,
// sans clé). Ce script a besoin d'un accès réseau réel (à exécuter en local ou
// dans une CI ayant accès à internet — pas dans un environnement d'exécution
// à accès réseau restreint). Les données produites sont commitées dans le repo
// et lues au build sans dépendance réseau (voir generate-sitemap.mjs).
//
// Usage : node scripts/seo-data/fetch-communes.mjs [--threshold=2000]
import { writeFile, readFile } from "node:fs/promises";
import { slugify } from "./slug.mjs";

// Seuil de population en dessous duquel une commune n'a pas de page dédiée :
// évite le contenu fin/dupliqué (des milliers de communes de quelques dizaines
// d'habitants n'ont aucun volume de recherche et diluent le budget de crawl).
// Ajustable via --threshold=N.
const thresholdArg = process.argv.find((a) => a.startsWith("--threshold="));
const POPULATION_THRESHOLD = thresholdArg
  ? Number(thresholdArg.split("=")[1])
  : 2000;

// centre (GeoJSON Point [lon, lat]), surface (hectares) et epci (objet
// {nom, code}) sont des champs documentés de l'API mais jamais demandés
// jusqu'ici — non vérifiés en conditions réelles dans cet environnement
// (accès réseau restreint, voir plus bas) : le log du premier enregistrement
// juste après la requête sert à confirmer leur forme réelle au premier run.
const API_URL =
  "https://geo.api.gouv.fr/communes?fields=nom,code,codeDepartement,codeRegion,population,codesPostaux,centre,surface,epci&format=json";

async function main() {
  console.log(`Fetching communes from ${API_URL} ...`);
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(
      `geo.api.gouv.fr a répondu ${res.status} ${res.statusText}`
    );
  }
  const communes = await res.json();
  console.log(`Reçu ${communes.length} communes au total.`);
  console.log(
    "Exemple de commune brute reçue (vérifier centre/surface/epci) :",
    JSON.stringify(communes[0])
  );

  const departments = JSON.parse(
    await readFile(
      new URL("../../src/data/seo/departments.json", import.meta.url)
    )
  );
  const departmentByCode = new Map(departments.map((d) => [d.code, d]));

  const seenSlugsByDept = new Map();

  const filtered = communes
    .filter((c) => (c.population ?? 0) >= POPULATION_THRESHOLD)
    .map((c) => {
      const dept = departmentByCode.get(c.codeDepartement);
      if (!dept) {
        console.warn(
          `Département inconnu "${c.codeDepartement}" pour la commune ${c.nom} (${c.code}) — ignorée.`
        );
        return null;
      }

      let slug = slugify(c.nom);
      const seen = seenSlugsByDept.get(dept.code) ?? new Set();
      if (seen.has(slug)) {
        // Collision rare (deux communes de même nom dans le même département) :
        // on désambiguïse avec le code INSEE pour garder une URL stable.
        slug = `${slug}-${c.code}`;
      }
      seen.add(slug);
      seenSlugsByDept.set(dept.code, seen);

      // centre est un Point GeoJSON [lon, lat] (ordre GeoJSON standard, pas
      // [lat, lon]) — absent pour de rares communes sans géométrie connue.
      const [lon, lat] = c.centre?.coordinates ?? [null, null];

      return {
        codeInsee: c.code,
        nom: c.nom,
        slug,
        codeDepartement: dept.code,
        departementSlug: dept.slug,
        departementNom: dept.nom,
        codeRegion: c.codeRegion,
        population: c.population ?? null,
        codePostal: c.codesPostaux?.[0] ?? null,
        lat: lat ?? null,
        lon: lon ?? null,
        surfaceHectares: c.surface ?? null,
        epciNom: c.epci?.nom ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      a.departementSlug === b.departementSlug
        ? a.nom.localeCompare(b.nom, "fr")
        : a.departementSlug.localeCompare(b.departementSlug, "fr")
    );

  const outPath = new URL("../../src/data/seo/communes.json", import.meta.url);
  await writeFile(outPath, JSON.stringify(filtered, null, 2) + "\n");

  console.log(
    `✓ ${filtered.length} communes (population >= ${POPULATION_THRESHOLD}) écrites dans src/data/seo/communes.json`
  );
}

main().catch((err) => {
  console.error("Échec de la génération des communes :", err.message);
  process.exitCode = 1;
});
