// Régénère public/sitemap.xml avant chaque build. Ne dépend d'aucun accès
// réseau : il lit les données déjà commitées dans src/data/seo/ (voir
// fetch-communes.mjs / fetch-hospitals.mjs pour les régénérer).
//
// Tant que src/data/seo/communes.json n'existe pas encore (pas encore généré
// faute d'accès réseau au moment de l'écriture de ce pipeline), le sitemap
// retombe sur les mêmes pages villes qu'aujourd'hui (FALLBACK_CITIES) pour ne
// rien casser. Dès que communes.json est généré, le sitemap couvre
// automatiquement toutes les communes retenues.
import { writeFile } from "node:fs/promises";
import ald from "../../src/data/seo/ald.json" with { type: "json" };

// Ce script tourne en Node pur (avant `vite build`), donc pas d'accès à
// `import.meta.env` : on lit directement `process.env`, que Vercel (et les
// autres CI) peuplent avec les variables VITE_* définies dans le projet.
const BASE_URL = process.env.VITE_APP_URL ?? "https://docteurtaxi.fr";

const STATIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/comment-ca-marche", changefreq: "monthly", priority: "0.8" },
  { path: "/tarifs-cpam", changefreq: "monthly", priority: "0.8" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/chauffeurs/inscription", changefreq: "monthly", priority: "0.7" },
  { path: "/chauffeurs/tarifs", changefreq: "monthly", priority: "0.6" },
  { path: "/blog", changefreq: "weekly", priority: "0.6" },
  { path: "/blog/transport-cpam", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/pmt-prescription", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/ald-transport", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/vsl-ou-taxi-conventionne", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/taxi-sans-prescription", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/transport-pmr-personnes-agees", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/accompagnant-taxi-conventionne", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/traitements-reguliers-taxi-conventionne", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/taxi-conventionne-grossesse", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/retour-domicile-sortie-hopital", changefreq: "yearly", priority: "0.6" },
  { path: "/blog/taxi-conventionne-sans-avance-frais", changefreq: "yearly", priority: "0.6" },
  { path: "/villes", changefreq: "monthly", priority: "0.8" },
  { path: "/maladies", changefreq: "monthly", priority: "0.8" },
  { path: "/cgv", changefreq: "yearly", priority: "0.3" },
  { path: "/confidentialite", changefreq: "yearly", priority: "0.3" },
  { path: "/mentions-legales", changefreq: "yearly", priority: "0.3" },
];

// Doit rester synchronisé avec `cityData` dans src/routes/$department.$city.tsx
// tant que ce fallback est utilisé (aucune page réelle pour d'autres villes).
const FALLBACK_CITIES = [
  { department: "paris", city: "paris" },
  { department: "rhone", city: "lyon" },
  { department: "bouches-du-rhone", city: "marseille" },
  { department: "gironde", city: "bordeaux" },
  { department: "haute-garonne", city: "toulouse" },
  { department: "alpes-maritimes", city: "nice" },
  { department: "loire-atlantique", city: "nantes" },
  { department: "bas-rhin", city: "strasbourg" },
];

async function loadCommunes() {
  try {
    const { default: communes } = await import(
      "../../src/data/seo/communes.json",
      { with: { type: "json" } }
    );
    return communes;
  } catch {
    return null;
  }
}

async function loadHospitals() {
  try {
    const { default: hospitals } = await import(
      "../../src/data/seo/hospitals.json",
      { with: { type: "json" } }
    );
    return hospitals;
  } catch {
    return null;
  }
}

function xmlEscape(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  const communes = await loadCommunes();
  const hospitals = await loadHospitals();

  const cityUrls = communes
    ? communes.map((c) => ({
        path: `/${c.departementSlug}/${c.slug}`,
        changefreq: "monthly",
        // Les plus grandes villes ont une priorité légèrement plus élevée.
        priority: c.population >= 50000 ? "0.8" : "0.6",
      }))
    : FALLBACK_CITIES.map(({ department, city }) => ({
        path: `/${department}/${city}`,
        changefreq: "monthly",
        priority: "0.7",
      }));

  // Une page /$department par département ayant au moins une commune
  // retenue (maillage interne — voir src/routes/$department.index.tsx).
  const departmentSlugs = communes
    ? [...new Set(communes.map((c) => c.departementSlug))]
    : [...new Set(FALLBACK_CITIES.map((c) => c.department))];
  const departmentUrls = departmentSlugs.map((slug) => ({
    path: `/${slug}`,
    changefreq: "monthly",
    priority: "0.6",
  }));

  const aldUrls = ald.map((a) => ({
    path: `/maladies/${a.slug}`,
    changefreq: "yearly",
    priority: "0.6",
  }));

  // Une page /hopitaux/$slug uniquement pour les établissements reliés à une
  // ville connue (voir fetch-hospitals.mjs) — pas de slug sinon.
  const hospitalUrls = (hospitals ?? [])
    .filter((h) => h.slug)
    .map((h) => ({
      path: `/hopitaux/${h.slug}`,
      changefreq: "yearly",
      priority: "0.5",
    }));

  const allUrls = [...STATIC_PAGES, ...departmentUrls, ...cityUrls, ...aldUrls, ...hospitalUrls];

  const body = allUrls
    .map(
      ({ path, changefreq, priority }) => `  <url>
    <loc>${xmlEscape(BASE_URL + path)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  await writeFile(new URL("../../public/sitemap.xml", import.meta.url), xml);

  console.log(
    `✓ sitemap.xml généré avec ${allUrls.length} URLs (${cityUrls.length} pages villes, ${aldUrls.length} pages maladies, ${hospitalUrls.length} pages hôpitaux, source: ${
      communes ? "src/data/seo/communes.json" : "liste de secours (communes.json absent)"
    })`
  );
}

main().catch((err) => {
  console.error("Échec de la génération du sitemap :", err.message);
  process.exitCode = 1;
});
