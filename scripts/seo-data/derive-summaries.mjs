// Dérive de petits fichiers résumés à partir de src/data/seo/communes.json
// (5509 entrées, ~700 Ko), pour que les composants qui n'ont besoin que d'un
// résumé (top villes pour le Footer, nombre de communes par département pour
// /villes) n'aient pas à importer le tableau complet et ne fassent pas
// gonfler le bundle client. Ne dépend d'aucun accès réseau — relit
// simplement les fichiers déjà générés par fetch-communes.mjs.
//
// Usage : node scripts/seo-data/derive-summaries.mjs
import { readFile, writeFile } from "node:fs/promises";

const TOP_COMMUNES_LIMIT = 30;

async function main() {
  const communes = JSON.parse(
    await readFile(new URL("../../src/data/seo/communes.json", import.meta.url))
  );
  const departments = JSON.parse(
    await readFile(new URL("../../src/data/seo/departments.json", import.meta.url))
  );

  const topCommunes = communes
    .slice()
    .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
    .slice(0, TOP_COMMUNES_LIMIT)
    .map((c) => ({
      codeInsee: c.codeInsee,
      nom: c.nom,
      slug: c.slug,
      departementSlug: c.departementSlug,
      departementNom: c.departementNom,
      population: c.population,
    }));

  await writeFile(
    new URL("../../src/data/seo/top-communes.json", import.meta.url),
    JSON.stringify(topCommunes, null, 2) + "\n"
  );

  const countByDepartment = new Map();
  for (const c of communes) {
    countByDepartment.set(c.departementSlug, (countByDepartment.get(c.departementSlug) ?? 0) + 1);
  }
  const departmentsWithCounts = departments.map((d) => ({
    ...d,
    nombreCommunes: countByDepartment.get(d.slug) ?? 0,
  }));

  await writeFile(
    new URL("../../src/data/seo/departments.json", import.meta.url),
    JSON.stringify(departmentsWithCounts, null, 2) + "\n"
  );

  console.log(
    `✓ top-communes.json (${topCommunes.length} villes) et departments.json (nombreCommunes) régénérés.`
  );
}

main().catch((err) => {
  console.error("Échec de la génération des résumés :", err.message);
  process.exitCode = 1;
});
