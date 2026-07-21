import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import regions from "~/data/seo/regions.json";
import departments from "~/data/seo/departments.json";
import { Input } from "~/components/ui/input";
import { CitySearch } from "~/components/CitySearch";
import { slugify } from "~/lib/utils";
import { BreadcrumbSchema } from "~/components/BreadcrumbSchema";

const departmentsByRegion = new Map<string, typeof departments>();
for (const d of departments) {
  const list = departmentsByRegion.get(d.codeRegion) ?? [];
  list.push(d);
  departmentsByRegion.set(d.codeRegion, list);
}
for (const list of departmentsByRegion.values()) {
  list.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

export const Route = createFileRoute("/villes")({
  head: () => ({
    meta: [
      { title: "Taxi conventionné Assurance Maladie partout en France — Docteur Taxi" },
      {
        name: "description",
        content:
          "Trouvez votre taxi médical conventionné Assurance Maladie par région et département, partout en France métropolitaine et outre-mer.",
      },
    ],
    links: [{ rel: "canonical", href: "https://mon-taxi-sante.com/villes" }],
  }),
  component: VillesPage,
});

function VillesPage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = slugify(query.trim());

  const filteredRegions = useMemo(() => {
    if (!normalizedQuery) return regions;
    return regions.filter((region) => {
      const regionDepartments = departmentsByRegion.get(region.code) ?? [];
      return (
        slugify(region.nom).includes(normalizedQuery) ||
        regionDepartments.some(
          (d) => slugify(d.nom).includes(normalizedQuery) || d.code === query.trim()
        )
      );
    });
  }, [normalizedQuery, query]);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Accueil", url: "https://mon-taxi-sante.com/" },
          { name: "Villes desservies", url: "https://mon-taxi-sante.com/villes" },
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
              <li className="text-white font-semibold" aria-current="page">Villes desservies</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-brand-green-300" aria-hidden="true" />
            <span className="text-brand-green-300 font-semibold">
              {departments.length} départements
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Taxi Conventionné Assurance Maladie<br />
            <span className="text-brand-green-300">partout en France</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mb-3">
            Tapez directement le nom de votre ville, ou parcourez par région
            et département ci-dessous.
          </p>
          <div className="max-w-md mb-8">
            <CitySearch placeholder="Votre ville (Paris, Lyon, Marseille...)" />
          </div>
          <div className="relative max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer par région ou département..."
              aria-label="Filtrer par région ou département"
              className="pl-11"
            />
          </div>
        </div>
      </section>

      <section className="section-medical bg-white">
        <div className="container space-y-12">
          {filteredRegions.length === 0 && (
            <p className="text-muted-foreground">
              Aucune région ou département ne correspond à « {query} ».
            </p>
          )}
          {filteredRegions.map((region) => {
            const regionDepartments = (departmentsByRegion.get(region.code) ?? []).filter(
              (d) =>
                !normalizedQuery ||
                slugify(region.nom).includes(normalizedQuery) ||
                slugify(d.nom).includes(normalizedQuery) ||
                d.code === query.trim()
            );
            if (regionDepartments.length === 0) return null;
            return (
              <div key={region.code}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{region.nom}</h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none">
                  {regionDepartments.map((department) => (
                    <li key={department.code}>
                      <Link
                        to="/$department"
                        params={{ department: department.slug }}
                        className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 hover:ring-brand-blue-300 transition-colors"
                      >
                        <span className="font-semibold text-gray-900">
                          {department.nom} ({department.code})
                        </span>
                        {department.nombreCommunes > 0 && (
                          <span className="text-sm text-muted-foreground shrink-0">
                            {department.nombreCommunes} ville
                            {department.nombreCommunes > 1 ? "s" : ""}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
