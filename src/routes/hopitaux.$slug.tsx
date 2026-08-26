import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Building2, MapPin, Phone, CheckCircle2, HeartPulse } from "lucide-react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { trackCallButtonClick } from "~/lib/trackCallClick";
import { getHospitalPageDataServerFn } from "~/server/seo";
import { FaqSchema } from "~/components/FaqSchema";
import { BreadcrumbSchema } from "~/components/BreadcrumbSchema";
import { aldList } from "~/lib/aldData";
import type { Hospital } from "~/lib/seoData";

// Recoupement catégorie FINESS -> ALD la plus pertinente. Volontairement
// limité aux libellés de catégorie effectivement présents dans les données
// (voir hospitals.json) plutôt que d'inventer une correspondance incertaine
// pour chaque spécialité.
const CATEGORY_TO_ALD_SLUG: { pattern: RegExp; aldSlug: string }[] = [
  { pattern: /dialyse/i, aldSlug: "nephropathie-chronique-grave-syndrome-nephrotique" },
  { pattern: /maladies mentales|psychiatr/i, aldSlug: "affections-psychiatriques-longue-duree" },
];

function getRelatedAld(hospital: Hospital) {
  if (!hospital.categorie) return null;
  const match = CATEGORY_TO_ALD_SLUG.find((c) => c.pattern.test(hospital.categorie ?? ""));
  if (!match) return null;
  return aldList.find((a) => a.slug === match.aldSlug) ?? null;
}

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
    const title = `Taxi conventionné vers ${hospital.nom}${villeSuffix} — Docteur Taxi`;
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
          href: `https://docteurtaxi.fr/hopitaux/${params.slug}`,
        },
      ],
    };
  },
  component: HospitalPage,
});

function HospitalSchema({ hospital, commune }: { hospital: Hospital; commune: ReturnType<typeof Route.useLoaderData>["commune"] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: hospital.nom,
    ...(hospital.telephone && { telephone: hospital.telephone }),
    ...(hospital.adresse && {
      address: {
        "@type": "PostalAddress",
        streetAddress: hospital.adresse,
        postalCode: hospital.codePostal ?? undefined,
        addressLocality: commune?.nom,
        addressCountry: "FR",
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

function HospitalPage() {
  const { slug } = Route.useParams();
  const { hospital, commune, otherHospitals } = Route.useLoaderData();
  const relatedAld = getRelatedAld(hospital);

  const faqItems = [
    {
      q: `Le transport vers ${hospital.nom} est-il remboursé par l'Assurance Maladie ?`,
      a: "Oui, sur prescription médicale de transport (PMT) et selon votre situation (ALD, CMU, ou taux standard de 65%). Le Tiers-Payant s'applique : vous n'avancez aucun frais.",
    },
    {
      q: "Comment réserver un taxi conventionné pour cet établissement ?",
      a: `Utilisez notre formulaire en ligne en 5 minutes, ou appelez le ${CONTACT_PHONE_DISPLAY} (gratuit). Votre réservation est confirmée immédiatement par email.`,
    },
    {
      q: "Proposez-vous des véhicules adaptés (PMR) ?",
      a: "Oui, nos chauffeurs partenaires disposent de véhicules adaptés aux fauteuils roulants avec rampe d'accès électrique et fixation homologuée, sur demande à la réservation.",
    },
    ...(relatedAld
      ? [
          {
            q: `Ce trajet est-il éligible à la prise en charge à 100% ALD ?`,
            a: `Si votre transport vers cet établissement est en lien avec une ALD comme « ${relatedAld.nomCourt} », il peut être remboursé à 100% sur prescription médicale.`,
          },
        ]
      : []),
  ];

  return (
    <>
      <HospitalSchema hospital={hospital} commune={commune} />
      <FaqSchema items={faqItems} />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", url: "https://docteurtaxi.fr/" },
          ...(commune
            ? [
                {
                  name: commune.nom,
                  url: `https://docteurtaxi.fr/${commune.departementSlug}/${commune.slug}`,
                },
              ]
            : []),
          { name: hospital.nom, url: `https://docteurtaxi.fr/hopitaux/${slug}` },
        ]}
      />

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
              onClick={() => trackCallButtonClick("hospital_page")}
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

          {relatedAld && (
            <Link
              to="/maladies/$ald"
              params={{ ald: relatedAld.slug }}
              className="mt-6 flex items-center gap-3 rounded-xl bg-brand-blue-50 p-4 ring-1 ring-brand-blue-100 hover:ring-brand-blue-300 transition-colors"
            >
              <HeartPulse className="h-5 w-5 text-brand-blue-600 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-gray-900">
                  Transport pris en charge à 100% pour {relatedAld.nomCourt.toLowerCase()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Voir les conditions de prise en charge pour cette ALD →
                </p>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="section-medical bg-brand-blue-50" aria-labelledby="why-heading">
        <div className="container max-w-3xl">
          <h2 id="why-heading" className="text-3xl font-bold text-gray-900 mb-6">
            Pourquoi réserver avec Docteur Taxi&nbsp;?
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

      <section className="section-medical bg-white" aria-labelledby="faq-heading">
        <div className="container max-w-3xl">
          <h2 id="faq-heading" className="text-3xl font-bold text-gray-900 mb-8">
            Questions fréquentes
          </h2>
          <dl className="space-y-6">
            {faqItems.map(({ q, a }) => (
              <div key={q} className="rounded-2xl bg-gray-50 p-6 ring-1 ring-gray-100">
                <dt className="font-bold text-gray-900 text-lg mb-2">{q}</dt>
                <dd className="text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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
