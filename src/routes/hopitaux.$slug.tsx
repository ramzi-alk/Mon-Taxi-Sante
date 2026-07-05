import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Building2, MapPin, Phone, CheckCircle2 } from "lucide-react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { getHospitalPageDataServerFn } from "~/server/seo";

export const Route = createFileRoute("/hopitaux/$slug")({
  loader: async ({ params }) => {
    const result = await getHospitalPageDataServerFn({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return {};
    const { hospital, commune } = loaderData;
    const villeSuffix = commune ? ` à ${commune.nom}` : "";
    const title = `Taxi conventionné vers ${hospital.nom}${villeSuffix} — Mon Taxi Santé`;
    const description = `Réservez votre taxi médical conventionné Assurance Maladie pour vous rendre à ${hospital.nom}${villeSuffix}. Tiers-Payant intégral, zéro avance de frais.`;
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
          href: `https://mon-taxi-sante.com/hopitaux/${params.slug}`,
        },
      ],
    };
  },
  component: HospitalPage,
});

function HospitalPage() {
  const { hospital, commune, otherHospitals } = Route.useLoaderData();

  return (
    <>
      <section className="bg-gradient-to-br from-brand-blue-700 to-brand-blue-600 text-white py-16">
        <div className="container">
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-blue-200 list-none">
              <li>
                <Link to="/" className="hover:text-white">Accueil</Link>
              </li>
              {commune && (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link
                      to="/$department/$city"
                      params={{ department: commune.departementSlug, city: commune.slug }}
                      className="hover:text-white"
                    >
                      {commune.nom}
                    </Link>
                  </li>
                </>
              )}
              <li aria-hidden="true">/</li>
              <li className="text-white font-semibold" aria-current="page">{hospital.nom}</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-brand-green-300" aria-hidden="true" />
            <span className="text-brand-green-300 font-semibold">
              {hospital.categorie ?? "Établissement de santé"}
              {commune ? ` — ${commune.nom}` : ""}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Taxi conventionné vers<br />
            <span className="text-brand-green-300">{hospital.nom}</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mb-8">
            Transport médical agréé Sécurité Sociale pour vous rendre à cet
            établissement. Tiers-Payant intégral, zéro avance de frais.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/reservation"
              className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-brand-blue-700 hover:bg-blue-50 rounded-xl transition-colors shadow-lg"
            >
              Réserver mon transport
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-white/40 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {CONTACT_PHONE_DISPLAY} (gratuit)
            </a>
          </div>
        </div>
      </section>

      <section className="section-medical bg-white" aria-labelledby="infos-heading">
        <div className="container max-w-3xl">
          <h2 id="infos-heading" className="text-3xl font-bold text-gray-900 mb-6">
            Informations pratiques
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {hospital.adresse && (
              <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <dt className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1">
                  <MapPin className="h-4 w-4 text-brand-blue-600" aria-hidden="true" />
                  Adresse
                </dt>
                <dd className="text-muted-foreground">
                  {hospital.adresse}
                  {hospital.codePostal || commune ? (
                    <>
                      <br />
                      {hospital.codePostal} {commune?.nom}
                    </>
                  ) : null}
                </dd>
              </div>
            )}
            {hospital.telephone && (
              <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <dt className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1">
                  <Phone className="h-4 w-4 text-brand-blue-600" aria-hidden="true" />
                  Téléphone de l'établissement
                </dt>
                <dd className="text-muted-foreground">{hospital.telephone}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <section className="section-medical bg-brand-blue-50" aria-labelledby="why-heading">
        <div className="container max-w-3xl">
          <h2 id="why-heading" className="text-3xl font-bold text-gray-900 mb-6">
            Pourquoi réserver avec Mon Taxi Santé&nbsp;?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Agréé Assurance Maladie",
                desc: "Chauffeurs conventionnés, habitués des trajets vers cet établissement.",
              },
              {
                title: "Tiers-Payant intégral",
                desc: "Vous n'avancez aucun frais : la facture part directement à l'Assurance Maladie.",
              },
              {
                title: "Véhicule PMR disponible",
                desc: "Véhicules adaptés aux fauteuils roulants sur demande à la réservation.",
              },
              {
                title: "Ponctualité garantie",
                desc: "Nos chauffeurs connaissent les accès et parkings de l'établissement.",
              },
            ].map(({ title, desc }) => (
              <div key={title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <CheckCircle2 className="h-6 w-6 text-brand-green-600 mb-3" aria-hidden="true" />
                <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {otherHospitals.length > 0 && commune && (
        <section className="section-medical bg-white" aria-labelledby="others-heading">
          <div className="container">
            <h2 id="others-heading" className="text-2xl font-bold text-gray-900 mb-6">
              Autres établissements à {commune.nom}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 list-none">
              {otherHospitals.map((h) =>
                h.slug ? (
                  <li key={h.slug}>
                    <Link
                      to="/hopitaux/$slug"
                      params={{ slug: h.slug }}
                      className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 hover:ring-brand-blue-300 transition-colors"
                    >
                      <span className="font-semibold text-gray-900">{h.nom}</span>
                      <ArrowRight className="h-4 w-4 text-brand-blue-600 shrink-0" aria-hidden="true" />
                    </Link>
                  </li>
                ) : null
              )}
            </ul>
          </div>
        </section>
      )}

      <section className="bg-brand-blue-700 text-white py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Besoin d&apos;un taxi vers {hospital.nom}&nbsp;?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Réservez en 5 minutes. Tiers-Payant intégral, zéro avance de frais.
          </p>
          <Link
            to="/reservation"
            className="btn-cta inline-flex items-center gap-2 bg-white text-brand-blue-700 hover:bg-blue-50 rounded-xl transition-colors shadow-lg"
          >
            Réserver maintenant
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
