import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  CheckCircle2,
  Car,
  Users,
} from "lucide-react";
import { TrustBadges } from "~/components/TrustBadges";
import { Testimonials } from "~/components/Testimonials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Mon Taxi Santé — Réservez votre taxi conventionné CPAM en ligne",
      },
      {
        name: "description",
        content:
          "Réservez votre taxi médical agréé Sécurité Sociale en 2 minutes. Tiers-Payant intégral, chauffeurs certifiés CPAM. Zéro avance de frais pour ALD, dialyse, chimiothérapie.",
      },
      { property: "og:title", content: "Mon Taxi Santé — Taxi conventionné CPAM" },
      {
        property: "og:description",
        content:
          "Le service de taxi médical agréé Sécurité Sociale. Réservation en ligne, Tiers-Payant, chauffeurs certifiés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
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
      "Votre réservation est confirmée par SMS et email. Un chauffeur conventionné CPAM accepte votre course.",
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

const conditions = [
  "Dialyse rénale",
  "Chimiothérapie",
  "Radiothérapie",
  "Rééducation PMR",
  "Consultations ALD",
  "Soins psychiatriques",
  "Maternité",
  "Urgences planifiées",
];

const stats = [
  { value: "50 000+", label: "Patients transportés" },
  { value: "98%", label: "Taux de ponctualité" },
  { value: "1 200+", label: "Chauffeurs certifiés" },
  { value: "4.9/5", label: "Note moyenne patients" },
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
              certifiés CPAM, zéro avance de frais.
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
                href="tel:+33800000000"
                className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Appeler le 0800 000 000 (gratuit)"
              >
                0800 000 000
              </a>
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

function StatsSection() {
  return (
    <section className="bg-[#0B0F1C]" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Nos chiffres clés
      </h2>
      <div className="container py-14 md:py-16">
        <ul
          className="grid grid-cols-2 md:grid-cols-4 gap-8 list-none"
          role="list"
        >
          {stats.map(({ value, label }) => (
            <li key={label} className="text-center">
              <p className="text-4xl md:text-5xl font-black text-white tracking-tight">
                {value}
              </p>
              <p className="text-sm text-white/40 mt-2 font-medium">{label}</p>
            </li>
          ))}
        </ul>
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
                <li
                  key={c}
                  className="flex items-center gap-2.5 text-sm text-white/70"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#1244E8] shrink-0"
                    aria-hidden="true"
                  />
                  {c}
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
              href="tel:+33800000000"
              className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:border-white/60 hover:bg-white/10 transition-colors"
            >
              Ou appeler le 0800 000 000
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
        "@id": "https://mon-taxi-sante.fr/#organization",
        name: "Mon Taxi Santé",
        url: "https://mon-taxi-sante.fr",
        description:
          "Plateforme de réservation de taxis conventionnés agréés Sécurité Sociale pour le transport médical en France.",
        telephone: "+33800000000",
        email: "contact@mon-taxi-sante.fr",
        areaServed: { "@type": "Country", name: "France" },
        serviceType: "Transport médical conventionné CPAM",
      },
      {
        "@type": "WebSite",
        "@id": "https://mon-taxi-sante.fr/#website",
        url: "https://mon-taxi-sante.fr",
        name: "Mon Taxi Santé",
        publisher: { "@id": "https://mon-taxi-sante.fr/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: "https://mon-taxi-sante.fr/search?q={search_term_string}",
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
      <StatsSection />
      <TrustBadges />
      <HowItWorksSection />
      <ConditionsSection />
      <Testimonials />
      <CtaBanner />
    </>
  );
}
