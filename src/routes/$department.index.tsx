import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import departments from "~/data/seo/departments.json";
import { getCommunesForDepartment } from "~/lib/seoData";

const departmentBySlug = new Map(departments.map((d) => [d.slug, d]));

export const Route = createFileRoute("/$department/")({
  head: ({ params }) => {
    const department = departmentBySlug.get(params.department);
    if (!department) return {};
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
  // Le loader ne sert qu'à valider l'existence du département (404 sinon) —
  // voir le commentaire équivalent dans $department.$city.tsx.
  loader: async ({ params }) => {
    const department = departmentBySlug.get(params.department);
    if (!department) throw notFound();
  },
});

function DepartmentPage() {
  const { department: departmentSlug } = Route.useParams();
  const department = departmentBySlug.get(departmentSlug);
  // Le loader a déjà validé l'existence du département (notFound() sinon).
  if (!department) return null;
  const communes = getCommunesForDepartment(departmentSlug);

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
          <p className="text-xl text-blue-100 max-w-2xl">
            Transport médical agréé Sécurité Sociale dans {communes.length} villes de{" "}
            {department.nom}. Tiers-Payant intégral, zéro avance de frais.
          </p>
        </div>
      </section>

      <section className="section-medical bg-white" aria-labelledby="villes-heading">
        <div className="container">
          <h2 id="villes-heading" className="text-3xl font-bold text-gray-900 mb-6">
            Villes desservies en {department.nom}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none">
            {communes.map((commune) => (
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
        </div>
      </section>
    </>
  );
}
