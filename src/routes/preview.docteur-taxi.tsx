import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/preview/docteur-taxi")({
  head: () => ({
    meta: [
      { title: "Aperçu — Docteur Taxi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DocteurTaxiPreview,
});

const SERIF = "'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SF Mono', Consolas, monospace";

const navLinks = [
  { to: "/comment-ca-marche" as const, label: "Comment ça marche" },
  { to: "/blog" as const, label: "Guides patients" },
  { to: "/mes-reservations" as const, label: "Suivre ma réservation" },
];

const palette = [
  { name: "Marine", hex: "#1C3D52", use: "Structure, titres, boutons" },
  { name: "Encre", hex: "#10202B", use: "Texte principal" },
  { name: "Veilleuse", hex: "#C7841E", use: "Accent unique — CTA" },
  { name: "Papier", hex: "#F5F7F8", use: "Fond clair" },
  { name: "Brique", hex: "#A63A2C", use: "Alertes, annulations" },
  { name: "Feuille", hex: "#3F6E52", use: "Confirmations" },
];

const logos = [
  {
    name: "Le dôme et la route",
    desc: "Un arc protecteur au-dessus d'une ligne de route pointillée.",
    svg: (
      <svg width="72" height="60" viewBox="0 0 86 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 44 A35 35 0 0 1 78 44" stroke="#1C3D52" strokeWidth="5" fill="none" strokeLinecap="round" />
        <line x1="8" y1="58" x2="78" y2="58" stroke="#10202B" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 14" />
        <circle cx="43" cy="44" r="4.5" fill="#C7841E" />
      </svg>
    ),
  },
  {
    name: "Le point de rendez-vous",
    desc: "Un repère de localisation lu comme une ordonnance abrégée.",
    svg: (
      <svg width="72" height="60" viewBox="0 0 86 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M43 8 C22 8 10 22 10 38 C10 54 43 66 43 66 C43 66 76 54 76 38 C76 22 64 8 43 8 Z"
          stroke="#1C3D52"
          strokeWidth="5"
          fill="none"
          strokeLinejoin="round"
        />
        <line x1="26" y1="34" x2="60" y2="34" stroke="#C7841E" strokeWidth="5" strokeLinecap="round" />
        <line x1="26" y1="46" x2="47" y2="46" stroke="#C7841E" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: "Le monogramme D",
    desc: "Un « D » dont la panse est un volant ouvert.",
    svg: (
      <svg width="72" height="60" viewBox="0 0 86 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M20 12 V60 M20 12 H46 A20 20 0 0 1 46 52 H20"
          stroke="#1C3D52"
          strokeWidth="6"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="58" y1="60" x2="72" y2="60" stroke="#C7841E" strokeWidth="6" strokeLinecap="round" />
      </svg>
    ),
  },
];

function DocteurTaxiPreview() {
  return (
    <div className="bg-[#F5F7F8]">
      {/* Bandeau interne — n'existe pas dans le site public */}
      <div
        className="bg-[#10202B] text-[#F5F7F8] text-center text-xs py-2 px-4"
        style={{ fontFamily: MONO, letterSpacing: "0.04em" }}
      >
        APERÇU INTERNE — lien privé, non indexé, non référencé dans le site
      </div>

      {/* Mock navbar rebrandée */}
      <header className="sticky top-0 z-40 bg-[#F5F7F8]/95 backdrop-blur-sm border-b border-[#D6DCDE]">
        <nav className="container flex h-16 items-center justify-between">
          <span className="flex items-center gap-0" style={{ fontFamily: SERIF }}>
            <span className="text-[1.3rem] text-[#10202B]">Docteur</span>
            <span className="text-[1.3rem] text-[#1C3D52] ml-1.5 italic">Taxi</span>
          </span>
          <ul className="hidden md:flex items-center gap-8 list-none" role="list">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="text-sm font-medium text-[#54666F] hover:text-[#10202B] transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/reservation"
            className="rounded-full bg-[#1C3D52] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#123044] transition-colors"
          >
            Réserver
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container py-20 md:py-28 text-center">
        <p
          className="text-xs uppercase mb-5 text-[#54666F]"
          style={{ fontFamily: MONO, letterSpacing: "0.14em" }}
        >
          Anciennement Mon Taxi Santé
        </p>
        <h1
          className="text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.05] text-[#10202B] mb-6"
          style={{ fontFamily: SERIF, textWrap: "balance" }}
        >
          Docteur <em className="text-[#1C3D52] not-italic font-normal">Taxi</em>
        </h1>
        <p className="max-w-xl mx-auto text-lg text-[#54666F] mb-10">
          Le trajet qui suit votre ordonnance. Transport conventionné, sans avance de frais,
          réservé en deux minutes.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/reservation"
            className="rounded-full bg-[#C7841E] text-white px-8 py-4 text-base font-semibold hover:bg-[#B37519] transition-colors"
          >
            Réserver mon trajet
          </Link>
          <Link
            to="/comment-ca-marche"
            className="rounded-full border border-[#D6DCDE] text-[#10202B] px-8 py-4 text-base font-semibold hover:bg-white transition-colors"
          >
            Comment ça marche
          </Link>
        </div>
      </section>

      {/* Avant / Après */}
      <section className="container pb-16">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border border-[#D6DCDE] bg-white py-6 px-4">
            <p className="text-xs uppercase text-[#54666F] mb-2" style={{ fontFamily: MONO, letterSpacing: "0.08em" }}>
              Avant
            </p>
            <p className="text-lg text-[#54666F] line-through decoration-[#A63A2C]/50">Mon Taxi Santé</p>
          </div>
          <div className="rounded-lg border-2 border-[#1C3D52] bg-white py-6 px-4">
            <p className="text-xs uppercase text-[#1C3D52] mb-2" style={{ fontFamily: MONO, letterSpacing: "0.08em" }}>
              Après
            </p>
            <p className="text-lg text-[#10202B] font-semibold" style={{ fontFamily: SERIF }}>
              Docteur Taxi
            </p>
          </div>
        </div>
      </section>

      {/* Palette */}
      <section className="container pb-16">
        <h2 className="text-center text-2xl mb-8 text-[#10202B]" style={{ fontFamily: SERIF }}>
          Palette
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
          {palette.map((c) => (
            <div key={c.hex} className="rounded-lg overflow-hidden border border-[#D6DCDE] bg-white">
              <div className="h-14" style={{ backgroundColor: c.hex }} />
              <div className="p-2.5">
                <p className="text-xs font-semibold text-[#10202B]">{c.name}</p>
                <p className="text-[11px] text-[#54666F]" style={{ fontFamily: MONO }}>
                  {c.hex}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Logos */}
      <section className="container pb-20">
        <h2 className="text-center text-2xl mb-8 text-[#10202B]" style={{ fontFamily: SERIF }}>
          Pistes de logo
        </h2>
        <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {logos.map((l) => (
            <div key={l.name} className="rounded-lg border border-[#D6DCDE] bg-white p-6 text-center">
              <div className="h-16 flex items-center justify-center mb-3">{l.svg}</div>
              <p className="text-sm font-semibold text-[#10202B]">{l.name}</p>
              <p className="text-xs text-[#54666F] mt-1">{l.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mock footer rebrandé */}
      <footer className="bg-[#10202B] text-[#96A7AE]">
        <div className="container py-14">
          <span className="flex items-center gap-0 mb-4" style={{ fontFamily: SERIF }}>
            <span className="text-[1.1rem] text-white">Docteur</span>
            <span className="text-[1.1rem] text-[#C7841E] ml-1.5 italic">Taxi</span>
          </span>
          <p className="text-sm max-w-md mb-6">
            La plateforme de réservation de taxis conventionnés agréée Assurance Maladie.
            Chaque trajet honore une ordonnance.
          </p>
          <div className="border-t border-white/10 pt-6 text-xs">
            © {new Date().getFullYear()} Docteur Taxi. Tous droits réservés.
          </div>
        </div>
      </footer>

      <div className="text-center py-8">
        <Link to="/" className="text-sm text-[#54666F] hover:text-[#10202B] underline">
          ← Retour au site actuel
        </Link>
      </div>
    </div>
  );
}
