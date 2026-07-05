import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, MapPin, CheckCircle2, Phone } from "lucide-react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { getCommune, getNearbyHospitals, type Commune, type Hospital } from "~/lib/seoData";

export const Route = createFileRoute("/$department/$city")({
  head: ({ params }) => {
    const commune = getCommune(params.department, params.city);
    if (!commune) return {};

    const title = `Taxi conventionné Assurance Maladie à ${commune.nom} (${commune.codeDepartement}) — Mon Taxi Santé`;
    const description = `Réservez votre taxi médical agréé Sécurité Sociale à ${commune.nom} en ${commune.departementNom}. Chauffeurs certifiés Assurance Maladie, Tiers-Payant intégral, zéro avance de frais. Disponible pour dialyse, chimiothérapie, ALD.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        {
          property: "og:url",
          content: `https://mon-taxi-sante.com/${params.department}/${params.city}`,
        },
        { name: "geo.region", content: `FR-${commune.codeDepartement}` },
        { name: "geo.placename", content: commune.nom },
      ],
      links: [
        {
          rel: "canonical",
          href: `https://mon-taxi-sante.com/${params.department}/${params.city}`,
        },
      ],
    };
  },
  component: LocalPage,
  // SSR cache headers set in vercel.json. Le loader ne sert qu'à valider
  // l'existence de la commune (404 sinon) — le composant relit les données
  // via useParams(), comme le reste des routes de ce projet (useLoaderData()
  // se heurte à un souci d'inférence de type dans cette version alpha du
  // routeur).
  loader: async ({ params }) => {
    const commune = getCommune(params.department, params.city);
    if (!commune) throw notFound();
  },
});

function LocalBusinessSchema({ commune, hospitals }: { commune: Commune; hospitals: Hospital[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `https://mon-taxi-sante.com/${commune.departementSlug}/${commune.slug}#business`,
    name: `Mon Taxi Santé — ${commune.nom}`,
    description: `Service de taxi médical conventionné Assurance Maladie à ${commune.nom} (${commune.codeDepartement}). Transport pour dialyse, chimiothérapie, ALD. Tiers-Payant.`,
    url: "https://mon-taxi-sante.com",
    telephone: CONTACT_PHONE_TEL,
    priceRange: "Pris en charge Assurance Maladie",
    image: "https://mon-taxi-sante.com/og-image.jpg",
    address: {
      "@type": "PostalAddress",
      addressLocality: commune.nom,
      addressRegion: commune.departementNom,
      addressCountry: "FR",
    },
    areaServed: {
      "@type": "City",
      name: commune.nom,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "06:00",
        closes: "22:00",
      },
    ],
    ...(hospitals.length > 0 && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Transports médicaux",
        itemListElement: hospitals.map((h, i) => ({
          "@type": "Offer",
          position: i + 1,
          name: `Transport vers ${h.nom}`,
          description: `Taxi conventionné Assurance Maladie depuis ${commune.nom} vers ${h.nom}`,
        })),
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function LocalPage() {
  const { department: departmentSlug, city: citySlug } = Route.useParams();
  const commune = getCommune(departmentSlug, citySlug);
  // Le loader a déjà validé l'existence de la commune (notFound() sinon) ;
  // ce cas ne devrait jamais s'afficher en pratique.
  if (!commune) return null;
  const hospitals = getNearbyHospitals(commune);
  const { nom: City, departementNom: Dept } = commune;

  const faqItems = [
    {
      q: `Comment réserver un taxi conventionné Assurance Maladie à ${City} ?`,
      a: `Utilisez notre formulaire en ligne en 5 minutes, ou appelez le ${CONTACT_PHONE_DISPLAY} (gratuit). Votre réservation est confirmée immédiatement par SMS.`,
    },
    {
      q: `Le transport médical est-il vraiment gratuit à ${City} ?`,
      a: `Grâce au Tiers-Payant, vous ne payez rien si vous êtes en ALD ou CMU. Pour les assurés standard, l'Assurance Maladie rembourse 65% et votre mutuelle peut couvrir le reste.`,
    },
    {
      q: `Quels hôpitaux desservez-vous à ${City} ?`,
      a: hospitals.length
        ? `Nous desservons ${hospitals.map((h) => h.nom).join(", ")} ainsi que tous les cabinets médicaux, centres de dialyse et établissements de santé de ${Dept}.`
        : `Nous desservons tous les cabinets médicaux, centres de dialyse et établissements de santé de ${City} et de ${Dept}.`,
    },
    {
      q: `Avez-vous des véhicules PMR à ${City} ?`,
      a: `Oui, nos chauffeurs partenaires à ${City} disposent de véhicules adaptés aux fauteuils roulants avec rampe d'accès électrique et fixation homologuée.`,
    },
  ];

  return (
    <>
      <LocalBusinessSchema commune={commune} hospitals={hospitals} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-blue-700 to-brand-blue-600 text-white py-16">
        <div className="container">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-blue-200 list-none">
              <li>
                <Link to="/" className="hover:text-white">Accueil</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/$department" params={{ department: commune.departementSlug }} className="hover:text-white">
                  {Dept}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white font-semibold" aria-current="page">{City}</li>
            </ol>
          </nav>

          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-brand-green-300" aria-hidden="true" />
            <span className="text-brand-green-300 font-semibold">
              Service disponible à {City}
              {commune.population ? ` — ${commune.population.toLocaleString("fr-FR")} habitants` : ""}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Taxi Conventionné Assurance Maladie<br />
            <span className="text-brand-green-300">à {City}</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mb-8">
            Transport médical agréé Sécurité Sociale en {Dept}.
            Chauffeurs certifiés, Tiers-Payant intégral, zéro avance de frais.
            Disponible 7j/7 pour tous vos soins médicaux.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/reservation"
              className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-brand-blue-700 hover:bg-blue-50 rounded-xl transition-colors shadow-lg"
            >
              Réserver à {City}
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

      {/* Hospitals served */}
      <section className="section-medical bg-white" aria-labelledby="hospitals-heading">
        <div className="container">
          <h2 id="hospitals-heading" className="text-3xl font-bold text-gray-900 mb-6">
            Hôpitaux et établissements desservis à {City}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Nos chauffeurs conventionnés transportent des patients vers tous les
            établissements de santé à {City} et en {Dept}.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none">
            {hospitals.map((hospital) => (
              <li
                key={hospital.finess ?? hospital.nom}
                className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100"
              >
                <CheckCircle2
                  className="h-5 w-5 text-brand-green-600 shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold text-gray-900">{hospital.nom}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Transport conventionné Assurance Maladie disponible
                  </p>
                </div>
              </li>
            ))}
            <li className="flex items-start gap-3 rounded-xl border-2 border-dashed border-gray-200 p-4">
              <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-semibold text-gray-700">+ Tous autres établissements</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cabinets, cliniques, centres de soin de {Dept}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Why us locally */}
      <section className="section-medical bg-brand-blue-50" aria-labelledby="why-local-heading">
        <div className="container">
          <h2 id="why-local-heading" className="text-3xl font-bold text-gray-900 mb-4">
            Pourquoi choisir Mon Taxi Santé à {City}&nbsp;?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: `Chauffeurs locaux à ${City}`,
                desc: `Nos chauffeurs partenaires connaissent parfaitement les routes de ${City} et de ${Dept}. Ponctualité garantie.`,
              },
              {
                title: "Disponible 7j/7",
                desc: "Tôt le matin pour vos séances de dialyse, le soir après une chimio. Nous sommes là quand vous en avez besoin.",
              },
              {
                title: "Agréé Assurance Maladie",
                desc: `Tous nos chauffeurs à ${City} sont conventionnés par l'Assurance Maladie de ${Dept}.`,
              },
              {
                title: "Véhicule PMR disponible",
                desc: `Des véhicules adaptés aux fauteuils roulants opèrent à ${City} et ses environs.`,
              },
              {
                title: "Réservation simple",
                desc: "Formulaire en ligne ou par téléphone. Pas besoin d'application mobile ni de compte client.",
              },
              {
                title: "Suivi en temps réel",
                desc: "Vous savez où est votre chauffeur. SMS de confirmation et rappel la veille du trajet.",
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

      {/* FAQ — SEO-rich structured content */}
      <section className="section-medical bg-white" aria-labelledby="faq-heading">
        <div className="container max-w-3xl">
          <h2 id="faq-heading" className="text-3xl font-bold text-gray-900 mb-8">
            Questions fréquentes — Taxi médical à {City}
          </h2>
          <dl className="space-y-6">
            {faqItems.map(({ q, a }) => (
              <div key={q} className="rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-100">
                <dt className="font-bold text-gray-900 text-lg mb-2">
                  {q}
                </dt>
                <dd className="text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Local CTA */}
      <section className="bg-brand-blue-700 text-white py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Besoin d&apos;un taxi médical à {City}&nbsp;?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Réservez en 5 minutes. Nos chauffeurs conventionnés Assurance Maladie en {Dept} sont prêts.
          </p>
          <Link
            to="/reservation"
            className="btn-cta inline-flex items-center gap-2 bg-white text-brand-blue-700 hover:bg-blue-50 rounded-xl transition-colors shadow-lg"
          >
            Réserver maintenant à {City}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
