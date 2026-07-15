import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  ChevronDown,
  Clock,
  MapPin,
  CheckCircle2,
  Car,
  Users,
} from "lucide-react";
import { TrustBadges } from "~/components/TrustBadges";
import { CitySearch } from "~/components/CitySearch";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Mon Taxi Santé — Réservez votre taxi conventionné Assurance Maladie en ligne",
      },
      {
        name: "description",
        content:
          "Réservez votre taxi médical agréé Sécurité Sociale en 2 minutes. Tiers-Payant intégral, chauffeurs certifiés Assurance Maladie. Zéro avance de frais pour ALD, dialyse, chimiothérapie.",
      },
      { property: "og:title", content: "Mon Taxi Santé — Taxi conventionné Assurance Maladie" },
      {
        property: "og:description",
        content:
          "Le service de taxi médical agréé Sécurité Sociale. Réservation en ligne, Tiers-Payant, chauffeurs certifiés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://mon-taxi-sante.com/" }],
  }),
  component: HomePage,
});

const howItWorksSteps = [
  {
    step: "01",
    icon: CalendarCheck,
    title: "Réservez à l'avance",
    description:
      "Remplissez notre formulaire sécurisé en 5 minutes. Indiquez votre adresse, l'hôpital, et la date de votre rendez-vous.",
  },
  {
    step: "02",
    icon: CheckCircle2,
    title: "Confirmation immédiate",
    description:
      "Votre réservation est confirmée par SMS et email. Un chauffeur conventionné Assurance Maladie accepte votre course.",
  },
  {
    step: "03",
    icon: Clock,
    title: "Le chauffeur arrive à l'heure",
    description:
      "Le jour J, votre chauffeur vous attend à l'heure convenue. Ponctualité garantie pour vos rendez-vous médicaux.",
  },
  {
    step: "04",
    icon: MapPin,
    title: "Zéro démarche administrative",
    description:
      "Le Tiers-Payant est géré directement. Vous ne payez rien. La facture part automatiquement à l'Assurance Maladie.",
  },
];

const conditions: { label: string; aldSlug?: string; toMaladiesIndex?: boolean }[] = [
  { label: "Dialyse rénale", aldSlug: "nephropathie-chronique-grave-syndrome-nephrotique" },
  { label: "Chimiothérapie", aldSlug: "tumeur-maligne-cancer" },
  { label: "Radiothérapie", aldSlug: "tumeur-maligne-cancer" },
  { label: "Rééducation PMR" },
  { label: "Consultations ALD", toMaladiesIndex: true },
  { label: "Soins psychiatriques", aldSlug: "affections-psychiatriques-longue-duree" },
  { label: "Maternité" },
  { label: "Urgences planifiées" },
];

type HomeFaqBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "heading"; text: string };

interface HomeFaqItem {
  question: string;
  blocks: HomeFaqBlock[];
}

const homeFaqItems: HomeFaqItem[] = [
  {
    question: "Quand mes frais de transport sont-ils remboursés par l'Assurance Maladie ?",
    blocks: [
      {
        kind: "paragraph",
        text: "Sur prescription médicale, l'Assurance Maladie peut rembourser vos frais de transport dans les situations suivantes :",
      },
      {
        kind: "list",
        items: [
          "Vous êtes hospitalisé : le transport aller et/ou retour est couvert, quelle que soit la durée du séjour (hospitalisation complète, partielle ou ambulatoire).",
          "Vous suivez un traitement lié à une affection de longue durée (ALD) et présentez une incapacité ou une déficience au déplacement reconnue par le Référentiel de prescription des transports.",
          "Votre état de santé impose d'être transporté allongé ou sous surveillance médicale.",
          "Le trajet dépasse 150 km en aller simple.",
          "Vous effectuez des transports en série pour un même traitement : au moins 4 trajets de plus de 50 km aller sur une période de deux mois.",
          "Vous êtes convoqué pour un contrôle réglementaire (contrôle médical, médecin expert ou fournisseur d'appareillage agréé).",
          "Le trajet concerne un centre d'action médico-sociale précoce (CAMSP) ou un centre médico-psycho-pédagogique (CMPP).",
          "Le transport est lié aux soins ou examens consécutifs à un accident du travail ou une maladie professionnelle.",
        ],
      },
    ],
  },
  {
    question: "Quelles sont les conditions pour bénéficier de la prise en charge du transport ?",
    blocks: [
      {
        kind: "paragraph",
        text: "Quel que soit le mode de transport utilisé, pour être remboursé vous devez disposer soit d'une prescription médicale délivrée par votre médecin, soit d'une convocation (service médical de l'Assurance Maladie, médecin expert, fournisseur d'appareillage, etc.). Dans certaines situations, le médecin remet une prescription accompagnée d'une demande d'accord préalable.",
      },
      { kind: "heading", text: "La prescription médicale" },
      {
        kind: "paragraph",
        text: "Votre médecin établit la prescription et choisit le mode de transport le plus adapté à votre état de santé et à votre autonomie, en se conformant au Référentiel de prescription des transports : véhicule personnel, transport en commun, transport assis professionnalisé (taxi conventionné ou véhicule sanitaire léger) ou ambulance.",
      },
      {
        kind: "paragraph",
        text: "Sauf urgence, la prescription (simple ou avec demande d'accord préalable) doit être établie avant la réalisation du transport ; en cas d'urgence (appel du 15), elle peut être complétée a posteriori par un médecin de la structure de soins. La demande d'accord préalable doit, elle, être envoyée à la caisse d'assurance maladie avant le transport.",
      },
      {
        kind: "paragraph",
        text: "Pour un transport en commun, si la personne doit être accompagnée ou s'il s'agit d'un enfant de moins de 16 ans, le médecin doit le préciser sur la prescription.",
      },
      { kind: "heading", text: "Le respect du mode de transport prescrit" },
      {
        kind: "paragraph",
        text: "Le remboursement suppose de respecter le mode de transport prescrit, sauf recours à un moyen moins coûteux. Par exemple, si un transport assis professionnalisé (taxi ou véhicule sanitaire léger) a été prescrit mais que vous êtes accompagné en voiture par un proche, vous pouvez demander le remboursement de vos frais de véhicule personnel pour motif médical.",
      },
      { kind: "heading", text: "L'accord préalable : des démarches supplémentaires" },
      {
        kind: "paragraph",
        text: "Une demande d'accord préalable de l'Assurance Maladie est nécessaire pour :",
      },
      {
        kind: "list",
        items: [
          "les transports de longue distance, de plus de 150 km en aller simple ;",
          "les transports en série, soit au moins 4 trajets de plus de 50 km aller sur deux mois pour un même traitement (non requis pour les transports en série liés à une ALD) ;",
          "les transports en avion ou bateau de ligne ;",
          "les transports des femmes enceintes en cas de maternité éloignée ;",
          "les transports liés aux soins des enfants et adolescents en CAMSP ou CMPP, ou nécessitant l'assistance d'un tiers ;",
          "les transports des adultes handicapés vers un service d'accompagnement médico-social pour adultes handicapés (SAMSAH).",
        ],
      },
      {
        kind: "paragraph",
        text: "Votre médecin vous remet une demande d'accord préalable, qui vaut prescription médicale de transport. Vous l'adressez complétée au médecin conseil de votre caisse d'assurance maladie, avant de prendre le transport, et devez attendre 15 jours : l'absence de réponse passé ce délai vaut accord ; en cas de refus, vous recevez un courrier de l'Assurance Maladie.",
      },
      { kind: "heading", text: "En cas d'affection de longue durée (ALD)" },
      {
        kind: "paragraph",
        text: "La prise en charge de vos transports liés à une ALD suppose de répondre aux conditions suivantes :",
      },
      {
        kind: "list",
        items: [
          "être reconnu atteint d'une ALD, exonérante ou non ;",
          "le transport est en lien avec cette ALD ;",
          "présenter des déficiences ou incapacités définies par le référentiel de prescription médicale des transports ;",
          "disposer d'une prescription médicale ou, selon le cas, de l'accord préalable de l'Assurance Maladie.",
        ],
      },
    ],
  },
  {
    question: "Quel mode de transport pouvez-vous utiliser ?",
    blocks: [
      {
        kind: "paragraph",
        text: "C'est avant tout votre état de santé qui détermine le mode de transport prescrit :",
      },
      {
        kind: "list",
        items: [
          "Vous devez être allongé ou demi-assis, sous surveillance, sous oxygène, brancardé, porté, ou transporté dans des conditions d'asepsie : une ambulance vous est prescrite.",
          "Vous avez besoin d'aide pour vous déplacer, risquez des effets secondaires pendant le trajet, ou votre état nécessite le respect rigoureux de règles d'hygiène : un transport assis professionnalisé (VSL — véhicule sanitaire léger — ou taxi conventionné) vous est prescrit ; en l'absence de contre-indication médicale, il s'agit par défaut d'un transport partagé.",
          "Vous pouvez vous déplacer seul ou accompagné d'un proche : votre véhicule personnel ou les transports en commun peuvent être utilisés.",
        ],
      },
      {
        kind: "paragraph",
        text: "La prise en charge de vos frais de transport par l'Assurance Maladie suppose une prescription médicale rédigée avant le transport.",
      },
      { kind: "heading", text: "Les modes de transport pris en charge" },
      {
        kind: "list",
        items: [
          "le véhicule personnel (le vôtre ou celui d'un proche) ;",
          "les transports en commun (bus, métro, train…) ;",
          "le transport assis professionnalisé (taxi conventionné ou véhicule sanitaire léger), par défaut partagé en l'absence de contre-indication médicale ;",
          "l'ambulance ;",
          "l'avion ;",
          "le bateau, en ligne régulière.",
        ],
      },
      {
        kind: "paragraph",
        text: "C'est le médecin qui détermine le mode de transport le mieux adapté à votre état de santé et à votre niveau d'autonomie. Si vous utilisez un moyen moins onéreux que celui prescrit, vous pouvez tout de même bénéficier d'une prise en charge.",
      },
    ],
  },
];

function HeroSection() {
  return (
    <section
      className="bg-white"
      aria-labelledby="hero-heading"
    >
      <div className="container py-16 md:py-24 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div className="animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              Agréé Sécurité Sociale · Tiers-Payant intégral
            </div>

            <h1
              id="hero-heading"
              className="text-5xl sm:text-6xl lg:text-[4.25rem] font-black tracking-tight leading-[1.05] text-[#0B0F1C] mb-6"
            >
              Votre taxi<br />
              médical.<br />
              <span className="text-[#1244E8]">
                Pris en charge<br />à 100%.
              </span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-md">
              Concentrez-vous sur votre santé — nous gérons la route et
              l&apos;administratif. Réservation en ligne 24h/24, chauffeurs
              certifiés Assurance Maladie, zéro avance de frais.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/reservation"
                className="btn-cta inline-flex items-center justify-center gap-2 bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Réserver mon taxi médical maintenant"
              >
                Réserver maintenant
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Appeler le ${CONTACT_PHONE_DISPLAY} (gratuit)`}
              >
                {CONTACT_PHONE_DISPLAY}
              </a>
            </div>

            {/* Recherche de ville */}
            <div className="mt-6 max-w-md">
              <p className="text-sm font-medium text-gray-500 mb-2">
                Ou trouvez directement le service dans votre ville
              </p>
              <CitySearch />
              <Link
                to="/villes"
                className="mt-2 inline-block text-sm text-[#1244E8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Parcourir toutes les villes desservies →
              </Link>
            </div>

            {/* Micro-trust */}
            <ul
              className="mt-8 flex flex-wrap gap-5 text-sm text-gray-400 list-none"
              aria-label="Garanties"
            >
              {[
                "Zéro avance de frais",
                "Confirmation par SMS",
                "Annulation gratuite 24h avant",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Booking preview card */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_4px_40px_rgba(0,0,0,0.07)]">
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-[#0B0F1C] text-sm">Réservation rapide</p>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full">
                  100% pris en charge
                </span>
              </div>

              {/* Route */}
              <div className="space-y-1">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3.5">
                  <div className="h-2 w-2 rounded-full bg-[#1244E8] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Départ</p>
                    <p className="text-sm font-semibold text-[#0B0F1C]">15 Rue de la Paix, Lyon</p>
                  </div>
                </div>
                <div className="ml-[1.35rem] h-4 border-l-2 border-dashed border-gray-200" aria-hidden="true" />
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Destination</p>
                    <p className="text-sm font-semibold text-[#0B0F1C]">Hôpital Édouard Herriot</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="rounded-xl bg-gray-50 px-4 py-3.5">
                  <p className="text-xs text-gray-400 font-medium">Date</p>
                  <p className="text-sm font-semibold text-[#0B0F1C]">Demain</p>
                </div>
                <div className="rounded-xl bg-gray-50 px-4 py-3.5">
                  <p className="text-xs text-gray-400 font-medium">Heure</p>
                  <p className="text-sm font-semibold text-[#0B0F1C]">08:30</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Tiers-Payant — vous ne payez rien
                  </p>
                  <p className="text-xs text-emerald-600">
                    Prise en charge directe par l'Assurance Maladie
                  </p>
                </div>
              </div>

              <Link
                to="/reservation"
                className="mt-4 w-full btn-cta flex items-center justify-center gap-2 bg-[#1244E8] text-white hover:bg-[#0F38C4] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Commencer ma réservation"
              >
                Commencer ma réservation
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="bg-[#F7F8FC]" aria-labelledby="how-heading">
      <div className="container py-20 md:py-28">
        <div className="mb-16">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Comment ça marche
          </p>
          <h2
            id="how-heading"
            className="text-4xl md:text-5xl font-black text-[#0B0F1C] tracking-tight leading-tight max-w-xl"
          >
            Réservé en 5 minutes.<br />
            Pris en charge automatiquement.
          </h2>
        </div>

        <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 list-none" role="list">
          {howItWorksSteps.map(({ step, icon: Icon, title, description }) => (
            <li key={step} className="relative">
              <div
                className="text-[5.5rem] font-black text-gray-150 leading-none select-none mb-2 text-gray-200"
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

        <div className="mt-14">
          <Link
            to="/reservation"
            className="btn-cta inline-flex items-center gap-2 bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Je réserve maintenant
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ConditionsSection() {
  return (
    <section
      className="bg-[#0B0F1C] text-white"
      aria-labelledby="conditions-heading"
    >
      <div className="container py-20 md:py-28">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
              Situations médicales
            </p>
            <h2
              id="conditions-heading"
              className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6"
            >
              Pour quelles<br />situations médicales&nbsp;?
            </h2>
            <p className="text-lg text-white/50 mb-10 leading-relaxed">
              Le transport médical conventionné est pris en charge par
              l&apos;Assurance Maladie pour de nombreuses situations. Votre
              médecin vous a prescrit un transport&nbsp;? Nous nous occupons du
              reste.
            </p>
            <ul className="grid grid-cols-2 gap-3 list-none" role="list">
              {conditions.map((c) => (
                <li key={c.label} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#1244E8] shrink-0"
                    aria-hidden="true"
                  />
                  {c.aldSlug ? (
                    <Link
                      to="/maladies/$ald"
                      params={{ ald: c.aldSlug }}
                      className="text-white/70 hover:text-white hover:underline"
                    >
                      {c.label}
                    </Link>
                  ) : c.toMaladiesIndex ? (
                    <Link to="/maladies" className="text-white/70 hover:text-white hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-white/70">{c.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: Car,
                title: "Taxi conventionné",
                desc: "Berline confortable pour 1 à 3 passagers. Idéal pour consultations et soins courants.",
              },
              {
                icon: Users,
                title: "VSL",
                desc: "Véhicule Sanitaire Léger pour les patients nécessitant une assistance.",
              },
              {
                icon: CheckCircle2,
                title: "Véhicule PMR",
                desc: "Véhicule adapté aux fauteuils roulants et personnes à mobilité réduite.",
              },
              {
                icon: MapPin,
                title: "Longue distance",
                desc: "Trajets inter-régionaux pour soins spécialisés non disponibles localement.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/5 p-5 hover:bg-white/8 transition-colors"
              >
                <Icon
                  className="h-7 w-7 text-[#1244E8] mb-3"
                  aria-hidden="true"
                />
                <h3 className="font-bold text-white text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFaqSection() {
  return (
    <section className="bg-[#F7F8FC]" aria-labelledby="home-faq-heading">
      <div className="container max-w-3xl py-20 md:py-28">
        <div className="mb-12">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            FAQ
          </p>
          <h2
            id="home-faq-heading"
            className="text-4xl md:text-5xl font-black text-[#0B0F1C] tracking-tight leading-tight"
          >
            Questions fréquentes
          </h2>
        </div>

        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white overflow-hidden">
          {homeFaqItems.map(({ question, blocks }) => (
            <details key={question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-[#0B0F1C] hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {question}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="px-5 pb-5 text-sm leading-relaxed text-gray-500 space-y-3">
                {blocks.map((block, index) => {
                  if (block.kind === "heading") {
                    return (
                      <p key={index} className="font-semibold text-[#0B0F1C] pt-1">
                        {block.text}
                      </p>
                    );
                  }
                  if (block.kind === "list") {
                    return (
                      <ul key={index} className="space-y-2 list-disc pl-5">
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={index}>{block.text}</p>;
                })}
              </div>
            </details>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/faq"
            className="text-sm font-semibold text-[#1244E8] hover:underline"
          >
            Voir toutes les questions fréquentes →
          </Link>
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section
      className="bg-[#1244E8] text-white"
      aria-labelledby="cta-heading"
    >
      <div className="container py-20 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            id="cta-heading"
            className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-4"
          >
            Votre prochain rendez-vous médical approche&nbsp;?
          </h2>
          <p className="text-xl text-white/70 mb-10">
            Anticipez votre transport dès maintenant. La réservation prend
            moins de 5 minutes et votre place est assurée.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/reservation"
              className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-[#1244E8] hover:bg-blue-50 transition-colors font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1244E8]"
              aria-label="Réserver mon transport médical"
            >
              Réserver mon transport
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:border-white/60 hover:bg-white/10 transition-colors"
            >
              Ou appeler le {CONTACT_PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeStructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://mon-taxi-sante.com/#organization",
        name: "Mon Taxi Santé",
        url: "https://mon-taxi-sante.com",
        description:
          "Plateforme de réservation de taxis conventionnés agréés Sécurité Sociale pour le transport médical en France.",
        telephone: CONTACT_PHONE_TEL,
        email: "contact@mon-taxi-sante.com",
        areaServed: { "@type": "Country", name: "France" },
        serviceType: "Transport médical conventionné Assurance Maladie",
      },
      {
        "@type": "WebSite",
        "@id": "https://mon-taxi-sante.com/#website",
        url: "https://mon-taxi-sante.com",
        name: "Mon Taxi Santé",
        publisher: { "@id": "https://mon-taxi-sante.com/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: "https://mon-taxi-sante.com/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

function HomePage() {
  return (
    <>
      <HomeStructuredData />
      <HeroSection />
      <TrustBadges />
      <HowItWorksSection />
      <ConditionsSection />
      <HomeFaqSection />
      <CtaBanner />
    </>
  );
}
