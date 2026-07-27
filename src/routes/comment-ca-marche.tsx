import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  CheckCircle2,
  Clock,
  Car,
  Users,
  ShieldCheck,
} from "lucide-react";
import { CONTACT_PHONE_DISPLAY } from "~/lib/contact";

export const Route = createFileRoute("/comment-ca-marche")({
  head: () => ({
    meta: [
      { title: "Comment ça marche — Docteur Taxi" },
      {
        name: "description",
        content:
          "Découvrez comment réserver votre taxi médical conventionné Assurance Maladie en ligne : réservation, prise en charge, déroulement du trajet et Tiers-Payant.",
      },
    ],
    links: [{ rel: "canonical", href: "https://docteurtaxi.fr/comment-ca-marche" }],
  }),
  component: CommentCaMarchePage,
});

const steps = [
  {
    step: "01",
    icon: CalendarCheck,
    title: "Réservez en ligne ou par téléphone",
    description:
      "Renseignez votre adresse de départ, votre destination (hôpital, clinique, cabinet médical) et le créneau souhaité. La réservation prend environ 5 minutes.",
  },
  {
    step: "02",
    icon: FileText,
    title: "Déclarez votre prise en charge",
    description:
      "Indiquez votre statut (ALD, CMU-C, CSS, assuré standard) et joignez votre Prescription Médicale de Transport (PMT) si vous en disposez déjà.",
  },
  {
    step: "03",
    icon: CheckCircle2,
    title: "Recevez votre confirmation",
    description:
      "Vous recevez une confirmation par email dès qu'un chauffeur conventionné Assurance Maladie accepte votre course, avec son nom et l'heure de passage.",
  },
  {
    step: "04",
    icon: Clock,
    title: "Le chauffeur vous prend en charge",
    description:
      "Le jour J, votre chauffeur vous attend à l'heure convenue avec un véhicule adapté à vos besoins (taxi, VSL ou véhicule PMR).",
  },
  {
    step: "05",
    icon: ShieldCheck,
    title: "Zéro avance de frais",
    description:
      "Grâce au Tiers-Payant, la facture est transmise directement à l'Assurance Maladie. Vous ne réglez rien le jour du transport si vous êtes pris en charge à 100 %.",
  },
];

const vehicles = [
  {
    icon: Car,
    title: "Taxi conventionné",
    desc: "Berline confortable pour 1 à 3 passagers. Idéal pour les consultations et soins courants.",
  },
  {
    icon: Users,
    title: "VSL",
    desc: "Véhicule Sanitaire Léger pour les patients nécessitant une assistance lors du déplacement.",
  },
  {
    icon: CheckCircle2,
    title: "Véhicule PMR",
    desc: "Véhicule adapté aux fauteuils roulants et aux personnes à mobilité réduite.",
  },
];

function CommentCaMarchePage() {
  return (
    <>
      <section className="bg-white">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Comment ça marche
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#0B0F1C] max-w-2xl">
            Réservez votre taxi médical en 5 étapes simples
          </h1>
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            Aucune avance de frais, aucune démarche administrative. Docteur
            Taxi gère la réservation, le chauffeur conventionné et la
            facturation à l'Assurance Maladie.
          </p>
          <div className="mt-8">
            <Link
              to="/reservation"
              className="btn-cta inline-flex items-center gap-2 bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
            >
              Réserver maintenant
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#F7F8FC]" aria-labelledby="steps-heading">
        <div className="container py-20 md:py-28">
          <h2 id="steps-heading" className="sr-only">
            Les étapes de la réservation
          </h2>
          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 list-none" role="list">
            {steps.map(({ step, icon: Icon, title, description }) => (
              <li key={step} className="relative">
                <div
                  className="text-[4.5rem] font-black text-gray-200 leading-none select-none mb-2"
                  aria-hidden="true"
                >
                  {step}
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1244E8]/10 mb-4">
                  <Icon className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
                </div>
                <h3 className="font-bold text-[#0B0F1C] text-lg mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white" aria-labelledby="vehicles-heading">
        <div className="container py-20 md:py-28">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Véhicules disponibles
          </p>
          <h2
            id="vehicles-heading"
            className="text-3xl md:text-4xl font-black text-[#0B0F1C] tracking-tight mb-12 max-w-lg"
          >
            Un véhicule adapté à chaque besoin
          </h2>
          <ul className="grid gap-6 sm:grid-cols-3 list-none" role="list">
            {vehicles.map(({ icon: Icon, title, desc }) => (
              <li
                key={title}
                className="rounded-xl border border-gray-100 p-6 hover:bg-gray-50/70 transition-colors"
              >
                <Icon className="h-7 w-7 text-[#1244E8] mb-3" aria-hidden="true" />
                <h3 className="font-bold text-[#0B0F1C] text-base mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#1244E8] text-white" aria-labelledby="cta-heading">
        <div className="container py-20 md:py-24 text-center max-w-2xl mx-auto">
          <h2 id="cta-heading" className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            Une question sur votre prise en charge ?
          </h2>
          <p className="text-lg text-white/70 mb-10">
            Consultez notre FAQ ou contactez-nous au {CONTACT_PHONE_DISPLAY}, gratuit
            depuis un poste fixe ou mobile.
          </p>
          <Link
            to="/faq"
            className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-[#1244E8] hover:bg-blue-50 transition-colors font-bold"
          >
            Consulter la FAQ
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
