import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/chauffeurs/tarifs")({
  head: () => ({
    meta: [
      { title: "Tarifs abonnement chauffeur — Docteur Taxi" },
      {
        name: "description",
        content:
          "Découvrez nos formules d'abonnement pour chauffeurs conventionnés : essai gratuit, abonnement mensuel ou annuel, sans engagement.",
      },
    ],
  }),
  component: TarifsChauffeurPage,
});

const plans = [
  {
    name: "Essai gratuit",
    price: "0 €",
    period: "pendant 30 jours",
    description: "Découvrez la plateforme et recevez vos premières courses.",
    features: [
      "Accès complet au tableau de bord",
      "Courses illimitées",
      "Support par email",
      "Sans engagement",
    ],
    highlighted: false,
  },
  {
    name: "Mensuel",
    price: "39 €",
    period: "par mois",
    description: "La formule la plus flexible pour votre activité.",
    features: [
      "Courses illimitées",
      "Tableau de bord temps réel",
      "Support prioritaire",
      "Sans engagement, résiliable à tout moment",
    ],
    highlighted: true,
  },
  {
    name: "Annuel",
    price: "29 €",
    period: "par mois, facturé annuellement",
    description: "2 mois offerts par rapport à la formule mensuelle.",
    features: [
      "Courses illimitées",
      "Tableau de bord temps réel",
      "Support prioritaire",
      "Tarif préférentiel garanti 12 mois",
    ],
    highlighted: false,
  },
];

function TarifsChauffeurPage() {
  return (
    <>
      <section className="bg-white">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Tarifs chauffeurs
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0B0F1C] max-w-2xl">
            Un abonnement simple, sans commission
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            Pas de commission sur vos courses. Un abonnement mensuel ou
            annuel fixe pour accéder à notre réseau de patients et à votre
            tableau de bord.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8FC]" aria-labelledby="plans-heading">
        <div className="container py-16 md:py-20">
          <h2 id="plans-heading" className="sr-only">
            Nos formules d'abonnement
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map(({ name, price, period, description, features, highlighted }) => (
              <div
                key={name}
                className={`rounded-2xl p-6 md:p-8 flex flex-col ${
                  highlighted
                    ? "bg-[#0B0F1C] text-white ring-2 ring-[#1244E8]"
                    : "bg-white ring-1 ring-gray-100"
                }`}
              >
                <h3 className={`text-lg font-bold ${highlighted ? "text-white" : "text-[#0B0F1C]"}`}>
                  {name}
                </h3>
                <p className={`mt-4 text-4xl font-black ${highlighted ? "text-white" : "text-[#0B0F1C]"}`}>
                  {price}
                </p>
                <p className={`text-sm ${highlighted ? "text-white/60" : "text-gray-400"}`}>
                  {period}
                </p>
                <p className={`mt-4 text-sm leading-relaxed ${highlighted ? "text-white/70" : "text-gray-500"}`}>
                  {description}
                </p>
                <ul className="mt-6 space-y-3 list-none flex-1" role="list">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2
                        className={`h-5 w-5 shrink-0 mt-0.5 ${
                          highlighted ? "text-emerald-400" : "text-emerald-500"
                        }`}
                        aria-hidden="true"
                      />
                      <span className={highlighted ? "text-white/80" : "text-gray-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/chauffeurs/inscription"
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    highlighted
                      ? "bg-white text-[#0B0F1C] hover:bg-blue-50"
                      : "bg-[#0B0F1C] text-white hover:bg-[#1244E8]"
                  }`}
                >
                  Choisir cette formule
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-gray-400 text-center">
            Tarifs hors taxes. Résiliable à tout moment depuis votre tableau
            de bord, sans frais.
          </p>
        </div>
      </section>

      <section className="bg-[#1244E8] text-white" aria-labelledby="cta-heading">
        <div className="container py-16 md:py-20 text-center max-w-2xl mx-auto">
          <h2 id="cta-heading" className="text-2xl md:text-3xl font-black tracking-tight mb-4">
            Prêt à rejoindre le réseau ?
          </h2>
          <p className="text-white/70 mb-8">
            Inscrivez-vous en quelques minutes, votre dossier est validé par
            notre équipe sous 48h.
          </p>
          <Link
            to="/chauffeurs/inscription"
            className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-[#1244E8] hover:bg-blue-50 transition-colors font-bold"
          >
            Devenir chauffeur partenaire
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
