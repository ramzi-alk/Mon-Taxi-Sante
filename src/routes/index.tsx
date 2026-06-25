import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  CheckCircle2,
  Car,
  Users,
  ChevronRight,
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
    color: "bg-brand-blue-50 text-brand-blue-600",
  },
  {
    step: "02",
    icon: CheckCircle2,
    title: "Confirmation immédiate",
    description:
      "Votre réservation est confirmée par SMS et email. Un chauffeur conventionné CPAM accepte votre course.",
    color: "bg-brand-green-50 text-brand-green-600",
  },
  {
    step: "03",
    icon: Clock,
    title: "Le chauffeur arrive à l'heure",
    description:
      "Le jour J, votre chauffeur vous attend à l'heure convenue. Ponctualité garantie pour vos rendez-vous médicaux.",
    color: "bg-brand-blue-50 text-brand-blue-600",
  },
  {
    step: "04",
    icon: MapPin,
    title: "Zéro démarche administrative",
    description:
      "Le Tiers-Payant est géré directement. Vous ne payez rien. La facture part automatiquement à l'Assurance Maladie.",
    color: "bg-brand-green-50 text-brand-green-600",
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
      className="relative overflow-hidden bg-gradient-to-br from-brand-blue-700 via-brand-blue-600 to-brand-blue-500 text-white"
      aria-labelledby="hero-heading"
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      <div className="container relative py-20 md:py-28 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="animate-fade-in">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-brand-green-400 animate-pulse" aria-hidden="true" />
              Agréé Sécurité Sociale • Tiers-Payant
            </div>

            <h1
              id="hero-heading"
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            >
              Votre taxi médical.{" "}
              <span className="text-brand-green-300">
                Pris en charge à 100%.
              </span>
            </h1>

            <p className="text-xl text-blue-100 leading-relaxed mb-8 max-w-lg">
              Concentrez-vous sur votre santé — nous gérons la route et
              l&apos;administratif. Réservation en ligne 24h/24, chauffeurs
              certifiés CPAM, zéro avance de frais.
            </p>

            {/* CTA buttons — oversized for accessibility */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/reservation"
                className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-brand-blue-700 hover:bg-blue-50 rounded-xl transition-colors shadow-lg shadow-blue-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue-600"
                aria-label="Réserver mon taxi médical maintenant"
              >
                Réserver maintenant
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href="tel:+33800000000"
                className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-white/40 bg-white/10 hover:bg-white/20 rounded-xl transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Nous appeler au 0800 000 000"
              >
                Appeler le 0800 000 000
              </a>
            </div>

            {/* Micro-trust */}
            <ul
              className="mt-8 flex flex-wrap gap-4 text-sm text-blue-100 list-none"
              aria-label="Garanties"
            >
              {[
                "✓ Zéro avance de frais",
                "✓ Confirmation par SMS",
                "✓ Annulation gratuite 24h avant",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Right: Booking preview card */}
          <div className="hidden lg:block">
            <div className="rounded-2xl bg-white p-6 shadow-2xl shadow-blue-900/30 text-gray-900">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Réservation rapide
              </p>

              {/* Mock form preview */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <MapPin className="h-5 w-5 text-brand-blue-500 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Départ</p>
                    <p className="text-sm font-medium">15 Rue de la Paix, Lyon</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                  <MapPin className="h-5 w-5 text-brand-green-500 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="text-sm font-medium">Hôpital Édouard Herriot</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                    <CalendarCheck className="h-5 w-5 text-brand-blue-500 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">Demain</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                    <Clock className="h-5 w-5 text-brand-blue-500 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-muted-foreground">Heure</p>
                      <p className="text-sm font-medium">08:30</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-brand-green-50 border border-brand-green-100 px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-green-600 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-brand-green-800">
                    Pris en charge à 100%
                  </p>
                  <p className="text-xs text-brand-green-600">
                    Tiers-Payant — vous ne payez rien
                  </p>
                </div>
              </div>

              <Link
                to="/reservation"
                className="mt-4 w-full btn-cta flex items-center justify-center gap-2 bg-brand-blue-600 text-white rounded-xl hover:bg-brand-blue-700 transition-colors"
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
    <section className="bg-white border-b" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Nos chiffres clés
      </h2>
      <div className="container py-10">
        <ul
          className="grid grid-cols-2 md:grid-cols-4 gap-8 list-none"
          role="list"
        >
          {stats.map(({ value, label }) => (
            <li key={label} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold text-brand-blue-600">
                {value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="section-medical bg-white" aria-labelledby="how-heading">
      <div className="container">
        <div className="text-center mb-14">
          <h2
            id="how-heading"
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            Aussi simple que de commander un taxi
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Notre plateforme a été conçue pour être utilisée par tous, même sans
            expérience du numérique.
          </p>
        </div>

        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 list-none" role="list">
          {howItWorksSteps.map(({ step, icon: Icon, title, description, color }) => (
            <li key={step} className="relative flex flex-col gap-4">
              {/* Connector line */}
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${color} text-2xl font-black`}
                  aria-hidden="true"
                >
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-5xl font-black text-gray-100 leading-none select-none">
                  {step}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg mb-1.5">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 text-center">
          <Link
            to="/reservation"
            className="btn-cta inline-flex items-center gap-2 bg-brand-blue-600 text-white rounded-xl hover:bg-brand-blue-700 transition-colors shadow-md shadow-brand-blue-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Je réserve mon taxi maintenant
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
      className="section-medical bg-brand-blue-50"
      aria-labelledby="conditions-heading"
    >
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2
              id="conditions-heading"
              className="text-3xl font-bold text-gray-900 mb-4"
            >
              Pour quelles situations médicales&nbsp;?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Le transport médical conventionné est pris en charge par
              l&apos;Assurance Maladie pour de nombreuses situations. Votre
              médecin vous a prescrit un transport&nbsp;? Nous nous occupons
              du reste.
            </p>
            <ul className="grid grid-cols-2 gap-3 list-none" role="list">
              {conditions.map((c) => (
                <li
                  key={c}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700"
                >
                  <CheckCircle2
                    className="h-4 w-4 text-brand-green-600 shrink-0"
                    aria-hidden="true"
                  />
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                to="/blog/transport-cpam"
                className="inline-flex items-center gap-1.5 text-brand-blue-600 font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                En savoir plus sur les transports pris en charge
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              {
                icon: Car,
                title: "Taxi conventionné",
                desc: "Berline confortable pour 1 à 3 passagers. Idéal pour consultations et soins courants.",
              },
              {
                icon: Users,
                title: "VSL",
                desc: "Véhicule Sanitaire Léger pour les patients pouvant s'asseoir mais nécessitant une assistance.",
              },
              {
                icon: CheckCircle2,
                title: "Véhicule PMR",
                desc: "Véhicule adapté aux fauteuils roulants et aux personnes à mobilité réduite.",
              },
              {
                icon: MapPin,
                title: "Longue distance",
                desc: "Trajets inter-régionaux pour les soins spécialisés non disponibles localement.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
              >
                <Icon
                  className="h-8 w-8 text-brand-blue-500 mb-3"
                  aria-hidden="true"
                />
                <h3 className="font-bold text-gray-900 text-sm mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
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
      className="bg-gradient-to-r from-brand-green-600 to-brand-green-500 text-white"
      aria-labelledby="cta-heading"
    >
      <div className="container py-16 text-center">
        <h2
          id="cta-heading"
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          Votre prochain rendez-vous médical approche&nbsp;?
        </h2>
        <p className="text-xl text-green-100 mb-8 max-w-xl mx-auto">
          Anticipez votre transport dès maintenant. La réservation prend moins de
          5 minutes et votre place est assurée.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/reservation"
            className="btn-cta inline-flex items-center justify-center gap-2 bg-white text-brand-green-700 hover:bg-green-50 rounded-xl transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-green-600"
            aria-label="Réserver mon transport médical"
          >
            Réserver mon transport
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <a
            href="tel:+33800000000"
            className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-white/40 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            Ou appeler le 0800 000 000
          </a>
        </div>
      </div>
    </section>
  );
}

// Schema.org — Organization + WebSite structured data
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
