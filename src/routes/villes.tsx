import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import regions from "~/data/seo/regions.json";
import departments from "~/data/seo/departments.json";
import { communesByDepartment } from "~/lib/seoData";

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
      { title: "Taxi conventionné Assurance Maladie partout en France — Mon Taxi Santé" },
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
  return (
    <>
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
          <p className="text-xl text-blue-100 max-w-2xl">
            Choisissez votre région puis votre département pour trouver les
            villes desservies par nos chauffeurs conventionnés.
          </p>
        </div>
      </section>

      <section className="section-medical bg-white">
        <div className="container space-y-12">
          {regions.map((region) => {
            const regionDepartments = departmentsByRegion.get(region.code) ?? [];
            if (regionDepartments.length === 0) return null;
            return (
              <div key={region.code}>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{region.nom}</h2>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none">
                  {regionDepartments.map((department) => {
                    const count = communesByDepartment.get(department.slug)?.length ?? 0;
                    return (
                      <li key={department.code}>
                        <Link
                          to="/$department"
                          params={{ department: department.slug }}
                          className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 hover:ring-brand-blue-300 transition-colors"
                        >
                          <span className="font-semibold text-gray-900">
                            {department.nom} ({department.code})
                          </span>
                          {count > 0 && (
                            <span className="text-sm text-muted-foreground shrink-0">
                              {count} ville{count > 1 ? "s" : ""}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
