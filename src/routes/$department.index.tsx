import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, MapPin, Search } from "lucide-react";
import { getDepartmentPageDataServerFn } from "~/server/seo";
import { Input } from "~/components/ui/input";
import { slugify } from "~/lib/utils";
import { BreadcrumbSchema } from "~/components/BreadcrumbSchema";

export const Route = createFileRoute("/$department/")({
  // Voir le commentaire équivalent dans $department.$city.tsx : la fonction
  // serveur évite d'embarquer communes.json (5509 entrées) dans le bundle
  // client de cette route.
  loader: async ({ params }) => {
    const result = await getDepartmentPageDataServerFn({ data: { department: params.department } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return {};
    const { department } = loaderData;
    const title = `Taxi conventionné Assurance Maladie en ${department.nom} — Mon Taxi Santé`;
    const description = `Transport médical agréé Sécurité Sociale dans tout le département ${department.nom} (${department.code}). Tiers-Payant intégral, chauffeurs conventionnés Assurance Maladie.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
      links: [
        {
          rel: "canonical",
          href: `https://mon-taxi-sante.com/${params.department}`,
        },
      ],
    };
  },
  component: DepartmentPage,
});

function DepartmentPage() {
  const { department, communes } = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const filteredCommunes = useMemo(() => {
    const q = slugify(query.trim());
    if (!q) return communes;
    return communes.filter((c) => slugify(c.nom).includes(q));
  }, [communes, query]);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Accueil", url: "https://mon-taxi-sante.com/" },
          { name: "Villes desservies", url: "https://mon-taxi-sante.com/villes" },
          { name: department.nom, url: `https://mon-taxi-sante.com/${department.slug}` },
        ]}
      />
      <section className="bg-gradient-to-br from-brand-blue-700 to-brand-blue-600 text-white py-16">
        <div className="container">
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-blue-200 list-none">
              <li>
                <Link to="/" className="hover:text-white">Accueil</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/villes" className="hover:text-white">Villes desservies</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white font-semibold" aria-current="page">{department.nom}</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-brand-green-300" aria-hidden="true" />
            <span className="text-brand-green-300 font-semibold">
              Département {department.code}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Taxi Conventionné Assurance Maladie<br />
            <span className="text-brand-green-300">en {department.nom}</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mb-8">
            Transport médical agréé Sécurité Sociale dans {communes.length} villes de{" "}
            {department.nom}. Tiers-Payant intégral, zéro avance de frais.
          </p>
          {communes.length > 12 && (
            <div className="relative max-w-md">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Rechercher une ville en ${department.nom}...`}
                aria-label={`Rechercher une ville en ${department.nom}`}
                className="pl-11"
              />
            </div>
          )}
        </div>
      </section>

      <section className="section-medical bg-white" aria-labelledby="villes-heading">
        <div className="container">
          <h2 id="villes-heading" className="text-3xl font-bold text-gray-900 mb-6">
            Villes desservies en {department.nom}
          </h2>
          {filteredCommunes.length === 0 ? (
            <p className="text-muted-foreground">
              Aucune ville ne correspond à « {query} » en {department.nom}.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none">
              {filteredCommunes.map((commune) => (
                <li key={commune.codeInsee}>
                  <Link
                    to="/$department/$city"
                    params={{ department: department.slug, city: commune.slug }}
                    className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 hover:ring-brand-blue-300 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{commune.nom}</span>
                    <ArrowRight className="h-4 w-4 text-brand-blue-600 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
