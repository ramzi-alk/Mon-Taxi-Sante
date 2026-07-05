import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, HeartPulse, CheckCircle2, Phone } from "lucide-react";
import { aldList } from "~/lib/aldData";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { CitySearch } from "~/components/CitySearch";
import { FaqSchema } from "~/components/FaqSchema";

const aldBySlug = new Map(aldList.map((a) => [a.slug, a]));

export const Route = createFileRoute("/maladies/$ald")({
  head: ({ params }) => {
    const affection = aldBySlug.get(params.ald);
    if (!affection) return {};
    const title = `Taxi conventionné ${affection.nomCourt} — 100% remboursé | Mon Taxi Santé`;
    const description = `Taxi conventionné Assurance Maladie pour ${affection.nom.toLowerCase()} : prise en charge à 100% du transport, Tiers-Payant, zéro avance de frais.`;
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
          href: `https://mon-taxi-sante.com/maladies/${params.ald}`,
        },
      ],
    };
  },
  component: MaladiePage,
  loader: async ({ params }) => {
    const affection = aldBySlug.get(params.ald);
    if (!affection) throw notFound();
  },
});

function MaladiePage() {
  const { ald: aldSlug } = Route.useParams();
  const affection = aldBySlug.get(aldSlug);
  // Le loader a déjà validé l'existence de l'ALD (notFound() sinon).
  if (!affection) return null;

  const faqItems = [
    {
      q: `Le transport est-il vraiment gratuit pour ${affection.nomCourt.toLowerCase()} ?`,
      a: `Si le transport est en lien direct avec votre ALD (ALD n°${affection.numero}) et fait l'objet d'une Prescription Médicale de Transport (PMT), il est remboursé à 100% du tarif conventionné. Le Tiers-Payant s'applique : vous n'avancez aucun frais.`,
    },
    {
      q: "Qui peut me délivrer la prescription médicale de transport ?",
      a: "Votre médecin traitant ou le spécialiste qui vous suit pour cette ALD peut établir la PMT, à joindre à votre réservation.",
    },
    {
      q: "Quels trajets sont concernés ?",
      a: `Tous les trajets liés au suivi de votre ALD : ${affection.soinsAssocies}, ainsi que les consultations de contrôle et les examens complémentaires prescrits dans ce cadre.`,
    },
    {
      q: "Avez-vous des véhicules adaptés (PMR) ?",
      a: "Oui, nos chauffeurs partenaires disposent de véhicules adaptés aux fauteuils roulants avec rampe d'accès électrique et fixation homologuée, sur demande à la réservation.",
    },
  ];

  return (
    <>
      <FaqSchema items={faqItems} />

      <section className="bg-gradient-to-br from-brand-blue-700 to-brand-blue-600 text-white py-16">
        <div className="container">
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-blue-200 list-none">
              <li>
                <Link to="/" className="hover:text-white">Accueil</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/maladies" className="hover:text-white">Maladies (ALD)</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-white font-semibold" aria-current="page">{affection.nomCourt}</li>
            </ol>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="h-5 w-5 text-brand-green-300" aria-hidden="true" />
            <span className="text-brand-green-300 font-semibold">
              ALD n°{affection.numero} — Prise en charge à 100%
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Taxi conventionné pour<br />
            <span className="text-brand-green-300">{affection.nomCourt}</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mb-8">
            {affection.introText ?? (
              <>
                Transport médical agréé Sécurité Sociale, remboursé à 100% sur
                prescription médicale. Tiers-Payant intégral, zéro avance de frais.
              </>
            )}
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

      <section className="section-medical bg-white" aria-labelledby="ald-heading">
        <div className="container max-w-3xl">
          <h2 id="ald-heading" className="text-3xl font-bold text-gray-900 mb-4">
            Qu'est-ce qu'une Affection de Longue Durée ?
          </h2>
          <p className="text-muted-foreground mb-4">
            « {affection.nom} » fait partie de la liste des 30 ALD dites
            « exonérantes » reconnues par l'Assurance Maladie : une maladie
            chronique nécessitant un suivi et des soins prolongés. Elle ouvre
            droit à une exonération du ticket modérateur, c'est-à-dire à une
            prise en charge à 100% des soins en lien avec la pathologie, y
            compris le transport.
          </p>
          <p className="text-muted-foreground">
            Dans ce cadre, les trajets fréquemment concernés incluent{" "}
            {affection.soinsAssocies}.
          </p>
        </div>
      </section>

      <section className="section-medical bg-brand-blue-50" aria-labelledby="prise-en-charge-heading">
        <div className="container max-w-3xl">
          <h2 id="prise-en-charge-heading" className="text-3xl font-bold text-gray-900 mb-6">
            Comment fonctionne la prise en charge ?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: "Prescription médicale de transport",
                desc: "Votre médecin établit une PMT liée à votre ALD, à joindre à votre réservation.",
              },
              {
                title: "Remboursement à 100%",
                desc: "Le transport en lien avec votre ALD est remboursé à 100% du tarif conventionné.",
              },
              {
                title: "Tiers-Payant intégral",
                desc: "Vous n'avancez aucun frais : le chauffeur facture directement l'Assurance Maladie.",
              },
              {
                title: "Réservation simple",
                desc: "Formulaire en ligne en 5 minutes ou réservation par téléphone, 7j/7.",
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

      <section className="section-medical bg-brand-blue-50" aria-labelledby="ville-heading">
        <div className="container max-w-md text-center">
          <h2 id="ville-heading" className="text-2xl font-bold text-gray-900 mb-2">
            Trouvez le service dans votre ville
          </h2>
          <p className="text-muted-foreground mb-5">
            Recherchez votre ville pour voir les hôpitaux desservis et réserver.
          </p>
          <CitySearch />
        </div>
      </section>

      <section className="bg-brand-blue-700 text-white py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">
            Besoin d&apos;un taxi médical pour votre ALD&nbsp;?
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
