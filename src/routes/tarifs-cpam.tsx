import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { FaqSchema } from "~/components/FaqSchema";
import { BreadcrumbSchema } from "~/components/BreadcrumbSchema";
import { FareEstimateForm } from "~/components/FareEstimateForm";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute("/tarifs-cpam")({
  head: () => ({
    meta: [
      { title: "Tarifs Taxi Conventionné CPAM 2025 : Forfait, Prix/km — Docteur Taxi" },
      {
        name: "description",
        content:
          "Taxi conventionné CPAM 2025 : forfait 13€, tarif/km par département, majorations. Remboursé à 100% en ALD, maternité, CMU-C, sans avance de frais avec le Tiers-Payant.",
      },
      { property: "og:title", content: "Tarifs Taxi Conventionné CPAM 2025 — Docteur Taxi" },
      {
        property: "og:description",
        content:
          "Forfait 13€, tarif/km par département, remboursement à 100% en ALD. Le détail complet de la convention nationale 2025.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/tarifs-cpam"),
  }),
  component: TarifsCpamPage,
});

const faqItems = [
  {
    q: "Combien coûte le forfait de base d'un taxi conventionné ?",
    a: "Le forfait de base est de 13,00 €. Il inclut les 4 premiers kilomètres du trajet et s'applique à chaque course.",
  },
  {
    q: "Qu'est-ce que le forfait grande ville ?",
    a: "Un forfait supplémentaire de 15,00 € s'ajoute si la prise en charge ou la dépose a lieu dans une grande ville (Paris, Lyon, Marseille, Bordeaux, Nantes, Toulouse, Grenoble, Lille, Strasbourg, Montpellier, Rennes, Nice ou les départements 92, 93, 94). Un seul forfait grande ville est appliqué par trajet.",
  },
  {
    q: "Suis-je remboursé à 100 % de mon transport ?",
    a: "Oui, si vous êtes en ALD, en maternité, ou bénéficiaire de la CMU-C/CSS et disposez d'une Prescription Médicale de Transport, le Tiers-Payant s'applique et vous ne réglez rien. Un assuré standard est remboursé à 65 %, le solde pouvant être couvert par une mutuelle.",
  },
  {
    q: "Le tarif au kilomètre est-il le même partout en France ?",
    a: "Non. Le tarif/km est fixé au niveau départemental selon l'ADS (autorisation de stationnement) du taxi et varie de 1,07 € à 1,27 € par kilomètre selon les départements.",
  },
  {
    q: "Une majoration s'applique-t-elle la nuit ou le week-end ?",
    a: "Oui, une majoration de 50 % s'applique sur le total de la course entre 20h et 8h, le samedi après 12h, le dimanche et les jours fériés.",
  },
];

const coverageRows = [
  { status: "ALD (Affection de Longue Durée)", rate: "100 %", note: "Tiers-Payant intégral avec PMT" },
  { status: "Maternité", rate: "100 %", note: "Tiers-Payant intégral avec PMT" },
  { status: "CMU-C / CSS", rate: "100 %", note: "Tiers-Payant intégral avec PMT" },
  { status: "Assuré standard", rate: "65 %", note: "Le solde peut être couvert par votre mutuelle" },
  { status: "Sans prescription ni prise en charge", rate: "0 %", note: "Frais personnels au tarif conventionné" },
];

const pricingComponents = [
  {
    label: "Forfait de base",
    amount: "13,00 €",
    note: "Inclut les 4 premiers kilomètres. Applicable à chaque trajet.",
  },
  {
    label: "Forfait grande ville",
    amount: "+ 15,00 €",
    note: "Ajouté si la prise en charge ou la dépose a lieu dans une grande ville (Paris, Lyon, Marseille, Bordeaux, Nantes, Toulouse, Grenoble, Lille, Strasbourg, Montpellier, Rennes, Nice ou dép. 92 / 93 / 94). Un seul forfait par trajet.",
  },
  {
    label: "Kilomètres supplémentaires",
    amount: "Tarif/km × (distance − 4 km)",
    note: "Au-delà des 4 km inclus dans le forfait, chaque km est facturé au tarif départemental (de 1,07 € à 1,27 € selon le département de l'ADS).",
  },
  {
    label: "Majoration horaire",
    amount: "+ 50 % sur le total",
    note: "Applicable de 20h à 8h, le samedi après 12h, le dimanche et les jours fériés. S'applique sur l'ensemble du tarif (forfaits + km + forfait grande ville).",
  },
  {
    label: "Retour à vide",
    amount: "+ 25 % ou + 50 % sur le tarif/km retour",
    note: "Uniquement pour les hospitalisations (complète, partielle, ambulatoire) ou soins répétés (dialyse, chimio, radio). +25 % si le trajet est ≤ 49 km, +50 % à partir de 50 km.",
  },
  {
    label: "Supplément TPMR",
    amount: "+ 30,00 €",
    note: "Transport avec aide particulière (fauteuil roulant, accompagnement spécifique).",
  },
  {
    label: "Frais de péage",
    amount: "Montant réel",
    note: "Remboursés sur justificatif.",
  },
];

const departementExamples = [
  { dept: "Paris (75)", tarif: "1,22 €/km" },
  { dept: "Rhône (69), Gironde (33), Bas-Rhin (67)", tarif: "1,07 €/km" },
  { dept: "Alpes-Maritimes (06), Corse (2A/2B), Nièvre (58)", tarif: "1,27 €/km" },
  { dept: "Nord (59), Oisne (60), Pas-de-Calais (62)", tarif: "1,20 €/km" },
  { dept: "Isère (38), Haute-Savoie (74)", tarif: "1,22 €/km" },
];

const sharedTransportRates = [
  { patients: "2 patients simultanément", abattement: "− 23 %", note: "Facture distincte par patient" },
  { patients: "3 patients simultanément", abattement: "− 35 %", note: "Facture distincte par patient" },
  { patients: "4 patients et plus", abattement: "− 37 %", note: "Facture distincte par patient" },
];

function TarifsCpamPage() {
  return (
    <>
      <FaqSchema items={faqItems} />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", url: "https://docteurtaxi.fr/" },
          { name: "Tarifs CPAM", url: "https://docteurtaxi.fr/tarifs-cpam" },
        ]}
      />

      <section className="bg-white">
        <div className="container py-16 md:py-24">
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-gray-400 list-none">
              <li>
                <Link to="/" className="hover:text-[#0B0F1C]">Accueil</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-[#0B0F1C] font-semibold" aria-current="page">Tarifs CPAM</li>
            </ol>
          </nav>
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Convention nationale 2025–2029
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0B0F1C] max-w-2xl">
            Tarifs taxi conventionné Assurance Maladie 2025
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            La nouvelle convention nationale taxi (arrêté du 29 juillet 2025, applicable depuis
            le 1er novembre 2025) fixe un mode de calcul unifié sur tout le territoire.
            Voici les règles en vigueur.
          </p>

          {/* Chiffres-clés — réponse immédiate pour un lecteur venu chercher un prix */}
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
            <div className="rounded-xl border border-gray-200 bg-[#F7F8FC] p-4 text-center">
              <p className="text-2xl font-black text-[#1244E8]">13 €</p>
              <p className="mt-1 text-xs text-gray-500">Forfait de base (4 km inclus)</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-[#F7F8FC] p-4 text-center">
              <p className="text-2xl font-black text-[#1244E8]">100 %</p>
              <p className="mt-1 text-xs text-gray-500">Remboursé en ALD, maternité, CMU-C</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-[#F7F8FC] p-4 text-center">
              <p className="text-2xl font-black text-[#1244E8]">0 €</p>
              <p className="mt-1 text-xs text-gray-500">Avance de frais avec le Tiers-Payant</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              to="/reservation"
              className="btn-cta inline-flex items-center justify-center gap-2 bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors font-bold"
            >
              Réserver maintenant
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div className="flex items-start gap-2 text-sm text-gray-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Les frais d'approche (trajet du chauffeur jusqu'au patient) ne sont pas facturables.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Estimateur de prix */}
      <section className="bg-white" aria-labelledby="estimate-heading">
        <div className="container py-16 md:py-20">
          <h2
            id="estimate-heading"
            className="text-2xl md:text-3xl font-black text-[#0B0F1C] tracking-tight mb-2"
          >
            Simulateur de prix
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl">
            Entre deux adresses, obtenez une estimation immédiate basée sur la distance réelle du
            trajet et la formule tarifaire de la convention 2025.
          </p>
          <div className="max-w-2xl">
            <FareEstimateForm />
          </div>
        </div>
      </section>

      {/* Composantes du tarif */}
      <section className="bg-[#F7F8FC]" aria-labelledby="pricing-heading">
        <div className="container py-16 md:py-20">
          <h2
            id="pricing-heading"
            className="text-2xl md:text-3xl font-black text-[#0B0F1C] tracking-tight mb-2"
          >
            Composantes du tarif (convention 2025)
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl">
            Le tarif d'un transport médical se calcule en additionnant les composantes suivantes,
            dans l'ordre.
          </p>
          <div className="space-y-4">
            {pricingComponents.map(({ label, amount, note }) => (
              <div
                key={label}
                className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <div className="flex-1">
                  <p className="font-bold text-[#0B0F1C]">{label}</p>
                  <p className="text-sm text-gray-500 mt-1">{note}</p>
                </div>
                <p className="shrink-0 font-mono font-semibold text-[#1244E8] text-sm sm:text-base">
                  {amount}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Besoin d'un véhicule adapté à un fauteuil roulant ? Voir notre guide{" "}
            <Link to="/blog/transport-pmr-personnes-agees" className="text-[#1244E8] underline">
              Taxi PMR
            </Link>
            . Vous hésitez entre taxi conventionné, VSL et ambulance ?{" "}
            <Link to="/blog/vsl-ou-taxi-conventionne" className="text-[#1244E8] underline">
              Voir les différences
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Exemples tarif km départemental */}
      <section className="bg-white" aria-labelledby="dept-heading">
        <div className="container py-16 md:py-20">
          <h2
            id="dept-heading"
            className="text-2xl md:text-3xl font-black text-[#0B0F1C] tracking-tight mb-2"
          >
            Tarif kilométrique par département
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl">
            Le tarif/km est fixé au niveau départemental en fonction de l'ADS (autorisation de
            stationnement) du taxi. Il varie de <strong>1,07 €</strong> à <strong>1,27 €</strong> par
            kilomètre selon les départements.
          </p>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Département(s)</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Tarif/km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departementExamples.map(({ dept, tarif }) => (
                  <tr key={dept}>
                    <td className="px-5 py-4 text-gray-600">{dept}</td>
                    <td className="px-5 py-4 font-bold text-[#1244E8]">{tarif}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Les tarifs complets des 96 départements sont consultables dans l'annexe de la
            convention nationale (p. 18).
          </p>
        </div>
      </section>

      {/* Transport partagé */}
      <section className="bg-[#F7F8FC]" aria-labelledby="shared-heading">
        <div className="container py-16 md:py-20">
          <h2
            id="shared-heading"
            className="text-2xl md:text-3xl font-black text-[#0B0F1C] tracking-tight mb-2"
          >
            Transport partagé
          </h2>
          <p className="text-gray-500 mb-8 max-w-xl">
            Lorsque plusieurs patients sont transportés simultanément, chacun reçoit une facture
            distincte avec un abattement selon le nombre de passagers.
          </p>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Situation</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Abattement</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sharedTransportRates.map(({ patients, abattement, note }) => (
                  <tr key={patients}>
                    <td className="px-5 py-4 font-medium text-[#0B0F1C]">{patients}</td>
                    <td className="px-5 py-4 font-bold text-[#1244E8]">{abattement}</td>
                    <td className="px-5 py-4 text-gray-500">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Prise en charge CPAM */}
      <section className="bg-white" aria-labelledby="coverage-heading">
        <div className="container py-16 md:py-20">
          <h2
            id="coverage-heading"
            className="text-2xl md:text-3xl font-black text-[#0B0F1C] tracking-tight mb-8"
          >
            Taux de prise en charge selon votre situation
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Situation</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Taux remboursé</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coverageRows.map(({ status, rate, note }) => (
                  <tr key={status}>
                    <td className="px-5 py-4 font-medium text-[#0B0F1C]">{status}</td>
                    <td className="px-5 py-4 font-bold text-[#1244E8]">{rate}</td>
                    <td className="px-5 py-4 text-gray-500">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Le taux de prise en charge s'applique au tarif conventionné, sur présentation d'une
            Prescription Médicale de Transport (PMT) valide. En savoir plus dans notre{" "}
            <Link to="/blog/pmt-prescription" className="text-[#1244E8] underline">
              guide sur la PMT
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Tiers-payant */}
      <section className="bg-[#0B0F1C] text-white" aria-labelledby="tp-heading">
        <div className="container py-16 md:py-20 max-w-2xl">
          <h2 id="tp-heading" className="text-2xl md:text-3xl font-black tracking-tight mb-6">
            Le Tiers-Payant, comment ça marche ?
          </h2>
          <ul className="space-y-4 list-none" role="list">
            {[
              "Vous déclarez votre statut de prise en charge lors de la réservation.",
              "Vous joignez votre Prescription Médicale de Transport (PMT) si vous en disposez.",
              "Le chauffeur facture directement l'Assurance Maladie via le formulaire CNAM 606b (nouvelle norme 2025).",
              "Vous ne réglez que le solde éventuel, le jour du transport.",
            ].map((text) => (
              <li key={text} className="flex items-start gap-3 text-white/80">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white" aria-labelledby="faq-heading">
        <div className="container max-w-3xl py-16 md:py-20">
          <h2 id="faq-heading" className="text-2xl md:text-3xl font-black text-[#0B0F1C] tracking-tight mb-8">
            Questions fréquentes
          </h2>
          <dl className="space-y-4">
            {faqItems.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-gray-200 bg-[#F7F8FC] p-5">
                <dt className="font-bold text-[#0B0F1C] mb-2">{q}</dt>
                <dd className="text-gray-500 text-sm leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-[#1244E8] text-white" aria-labelledby="cta-heading">
        <div className="container py-16 md:py-20 text-center max-w-2xl mx-auto">
          <h2 id="cta-heading" className="text-2xl md:text-3xl font-black tracking-tight mb-4">
            Vérifiez votre prise en charge en réservant
          </h2>
          <p className="text-white/70 mb-8">
            Indiquez votre statut Assurance Maladie dans le formulaire — nos chauffeurs appliquent
            les tarifs de la convention 2025 avec télétransmission directe à l'Assurance Maladie.
          </p>
          <Link
            to="/reservation"
            className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-[#1244E8] hover:bg-blue-50 transition-colors font-bold"
          >
            Réserver maintenant
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
