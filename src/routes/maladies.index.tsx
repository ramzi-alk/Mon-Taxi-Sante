import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartPulse, ArrowRight, Search } from "lucide-react";
import ald from "~/data/seo/ald.json";
import { Input } from "~/components/ui/input";
import { slugify } from "~/lib/utils";

export const Route = createFileRoute("/maladies/")({
  head: () => ({
    meta: [
      {
        title:
          "Transport médical par affection (ALD) : liste des 30 pathologies — Mon Taxi Santé",
      },
      {
        name: "description",
        content:
          "Transport pris en charge à 100% pour les 30 Affections de Longue Durée (ALD) : dialyse, cancer, diabète, sclérose en plaques... Trouvez votre pathologie.",
      },
    ],
    links: [{ rel: "canonical", href: "https://mon-taxi-sante.com/maladies" }],
  }),
  component: MaladiesPage,
});

function MaladiesPage() {
  const [query, setQuery] = useState("");

  const filteredAld = useMemo(() => {
    const q = slugify(query.trim());
    if (!q) return ald;
    return ald.filter((a) => slugify(a.nom).includes(q) || slugify(a.nomCourt).includes(q));
  }, [query]);

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
              <li className="text-white font-semibold" aria-current="page">Maladies (ALD)</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="h-5 w-5 text-brand-green-300" aria-hidden="true" />
            <span className="text-brand-green-300 font-semibold">
              {ald.length} Affections de Longue Durée
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Transport médical pris en charge<br />
            <span className="text-brand-green-300">à 100% selon votre pathologie</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mb-8">
            Si votre transport est en lien avec une Affection de Longue Durée (ALD)
            et fait l'objet d'une prescription médicale, il est remboursé à 100%
            par l'Assurance Maladie. Trouvez votre pathologie ci-dessous.
          </p>
          <div className="relative max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une pathologie..."
              aria-label="Rechercher une pathologie"
              className="pl-11"
            />
          </div>
        </div>
      </section>

      <section className="section-medical bg-white">
        <div className="container">
          {filteredAld.length === 0 ? (
            <p className="text-muted-foreground">
              Aucune pathologie ne correspond à « {query} ».
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none">
              {filteredAld.map((a) => (
                <li key={a.slug}>
                  <Link
                    to="/maladies/$ald"
                    params={{ ald: a.slug }}
                    className="flex items-start justify-between gap-3 h-full rounded-xl bg-gray-50 p-5 ring-1 ring-gray-100 hover:ring-brand-blue-300 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-gray-900">{a.nomCourt}</span>
                      {a.nomCourt !== a.nom && (
                        <p className="text-xs text-muted-foreground mt-1">{a.nom}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-brand-blue-600 shrink-0 mt-1" aria-hidden="true" />
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
