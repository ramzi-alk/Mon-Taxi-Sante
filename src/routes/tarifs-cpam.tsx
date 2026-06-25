import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/tarifs-cpam")({
  head: () => ({
    meta: [
      { title: "Tarifs et remboursements CPAM — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Découvrez les tarifs conventionnés du transport médical et les taux de remboursement de l'Assurance Maladie selon votre situation.",
      },
    ],
  }),
  component: TarifsCpamPage,
});

const coverageRows = [
  { status: "ALD (Affection de Longue Durée)", rate: "100 %", note: "Tiers-Payant intégral avec PMT" },
  { status: "Maternité", rate: "100 %", note: "Tiers-Payant intégral avec PMT" },
  { status: "CMU-C / CSS", rate: "100 %", note: "Tiers-Payant intégral avec PMT" },
  { status: "Assuré standard", rate: "65 %", note: "Le solde peut être couvert par votre mutuelle" },
  { status: "Sans prescription ni prise en charge", rate: "0 %", note: "Frais personnels au tarif conventionné" },
];

const vehicleRates = [
  { vehicle: "Taxi conventionné", baseFare: "2,60 €", perKm: "1,21 €/km", minFare: "7,30 €" },
  { vehicle: "VSL (Véhicule Sanitaire Léger)", baseFare: "—", perKm: "0,95 €/km", minFare: "10,00 €" },
  { vehicle: "Véhicule PMR", baseFare: "2,60 €", perKm: "1,21 €/km + supplément 5,00 €", minFare: "10,00 €" },
];

function TarifsCpamPage() {
  return (
    <>
      <section className="bg-white">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Tarifs et remboursements
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0B0F1C] max-w-2xl">
            Des tarifs conventionnés, transparents
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            Nos chauffeurs appliquent les tarifs fixés par la convention
            nationale des taxis conventionnés avec l'Assurance Maladie.
            Aucune surprise, aucun frais caché.
          </p>
        </div>
      </section>

      <section className="bg-[#F7F8FC]" aria-labelledby="coverage-heading">
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
            Le taux de prise en charge s'applique au tarif conventionné, sur
            présentation d'une Prescription Médicale de Transport (PMT)
            valide. En savoir plus dans notre{" "}
            <Link to="/blog/pmt-prescription" className="text-[#1244E8] underline">
              guide sur la PMT
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-white" aria-labelledby="rates-heading">
        <div className="container py-16 md:py-20">
          <h2
            id="rates-heading"
            className="text-2xl md:text-3xl font-black text-[#0B0F1C] tracking-tight mb-8"
          >
            Tarif conventionné par type de véhicule
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Véhicule</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Prise en charge</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Tarif au km</th>
                  <th scope="col" className="px-5 py-3 font-semibold text-[#0B0F1C]">Tarif minimum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicleRates.map(({ vehicle, baseFare, perKm, minFare }) => (
                  <tr key={vehicle}>
                    <td className="px-5 py-4 font-medium text-[#0B0F1C]">{vehicle}</td>
                    <td className="px-5 py-4 text-gray-500">{baseFare}</td>
                    <td className="px-5 py-4 text-gray-500">{perKm}</td>
                    <td className="px-5 py-4 text-gray-500">{minFare}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            Tarifs indicatifs issus de la convention nationale en vigueur,
            zone urbaine, tarif de jour. Le tarif exact dépend de votre
            département et de l'heure du trajet.
          </p>
        </div>
      </section>

      <section className="bg-[#0B0F1C] text-white" aria-labelledby="tp-heading">
        <div className="container py-16 md:py-20 max-w-2xl">
          <h2 id="tp-heading" className="text-2xl md:text-3xl font-black tracking-tight mb-6">
            Le Tiers-Payant, comment ça marche ?
          </h2>
          <ul className="space-y-4 list-none" role="list">
            {[
              "Vous déclarez votre statut de prise en charge lors de la réservation.",
              "Vous joignez votre Prescription Médicale de Transport (PMT) si vous en disposez.",
              "Le chauffeur facture directement l'Assurance Maladie pour la part remboursée.",
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

      <section className="bg-[#1244E8] text-white" aria-labelledby="cta-heading">
        <div className="container py-16 md:py-20 text-center max-w-2xl mx-auto">
          <h2 id="cta-heading" className="text-2xl md:text-3xl font-black tracking-tight mb-4">
            Vérifiez votre prise en charge en réservant
          </h2>
          <p className="text-white/70 mb-8">
            Indiquez votre statut CPAM dans le formulaire et obtenez une
            estimation immédiate du montant à votre charge.
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
