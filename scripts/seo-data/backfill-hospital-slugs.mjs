// Corrige puis ajoute le champ `slug` aux hôpitaux déjà présents dans
// src/data/seo/hospitals.json, sans re-télécharger le CSV FINESS (pas
// d'accès réseau nécessaire). À usage ponctuel : les prochains runs de
// fetch-hospitals.mjs génèrent déjà tout ça directement (voir
// normalizeArrondissement() et la génération de slug dans ce script).
import { readFile, writeFile } from "node:fs/promises";
import { slugify } from "./slug.mjs";

// Même logique que normalizeArrondissement() dans fetch-hospitals.mjs : les
// données déjà commitées ont été générées AVANT ce correctif, donc Paris/
// Lyon/Marseille en arrondissement (75101-75120, 69381-69389, 13201-13216)
// ont encore departementSlug=null malgré un codeInseeCommune présent.
function normalizeArrondissement(codeInsee) {
  const n = Number(codeInsee);
  if (codeInsee.startsWith("751") && n >= 75101 && n <= 75120) return "75056";
  if (codeInsee.startsWith("693") && n >= 69381 && n <= 69389) return "69123";
  if (codeInsee.startsWith("132") && n >= 13201 && n <= 13216) return "13055";
  return codeInsee;
}

async function main() {
  const communes = JSON.parse(
    await readFile(new URL("../../src/data/seo/communes.json", import.meta.url), "utf-8")
  );
  const communesIndex = new Map(communes.map((c) => [c.codeInsee, c]));

  const path = new URL("../../src/data/seo/hospitals.json", import.meta.url);
  const hospitals = JSON.parse(await readFile(path, "utf-8"));

  let relinked = 0;
  for (const h of hospitals) {
    if (h.departementSlug || !h.codeInseeCommune) continue;
    const commune = communesIndex.get(normalizeArrondissement(h.codeInseeCommune));
    if (!commune) continue;
    h.communeNom = commune.nom;
    h.departementSlug = commune.departementSlug;
    h.departementNom = commune.departementNom;
    relinked++;
  }

  const seenSlugs = new Set();
  let slugged = 0;
  for (const h of hospitals) {
    if (!h.departementSlug) continue;
    let slug = slugify(`${h.nom}-${h.communeNom}`);
    if (seenSlugs.has(slug)) slug = `${slug}-${h.finess}`;
    seenSlugs.add(slug);
    h.slug = slug;
    slugged++;
  }

  await writeFile(path, JSON.stringify(hospitals, null, 2) + "\n");
  console.log(
    `✓ ${relinked} hôpitaux reliés à une ville via normalisation d'arrondissement, ${slugged} slugs écrits dans src/data/seo/hospitals.json`
  );
}

main().catch((err) => {
  console.error("Échec du backfill :", err.message);
  process.exitCode = 1;
});
