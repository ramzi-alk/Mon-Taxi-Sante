import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Phone, Heart } from "lucide-react";
import { cn } from "~/lib/utils";

const navLinks = [
  { to: "/reservation", label: "Réserver un taxi" },
  { to: "/comment-ca-marche", label: "Comment ça marche" },
  { to: "/blog", label: "Guides patients" },
  { to: "/connexion", label: "Espace chauffeur", driver: true },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      {/* Accessibility: skip link */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      {/* Top bar — phone number for elderly users */}
      <div className="bg-brand-blue-600 text-white text-sm">
        <div className="container flex items-center justify-between py-1.5">
          <span className="flex items-center gap-1.5 font-medium">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Besoin d&apos;aide&nbsp;? Appelez le{" "}
            <a
              href="tel:+33800000000"
              className="underline underline-offset-2 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Appeler Mon Taxi Santé au 0800 000 000"
            >
              0800 000 000
            </a>{" "}
            (gratuit)
          </span>
          <span className="hidden sm:flex items-center gap-1 text-blue-100 text-xs">
            <Heart className="h-3 w-3 fill-red-300 text-red-300" aria-hidden="true" />
            Agréé Sécurité Sociale
          </span>
        </div>
      </div>

      <nav aria-label="Navigation principale">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            aria-label="Mon Taxi Santé — Accueil"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue-600 text-white font-bold text-lg select-none">
              M
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-brand-blue-700 text-lg">Mon Taxi</span>
              <span className="text-brand-green-600 font-semibold text-sm -mt-0.5">Santé</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-6 list-none" role="list">
            {navLinks.map(({ to, label, driver }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
                    driver
                      ? "text-brand-green-600 hover:text-brand-green-700"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA — large for accessibility */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/reservation"
              className="btn-cta bg-brand-blue-600 hover:bg-brand-blue-700 text-white rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Réserver mon taxi maintenant"
            >
              Réserver maintenant
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="mobile-menu" className="md:hidden border-t bg-white">
            <ul className="container flex flex-col gap-1 py-4 list-none" role="list">
              {navLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  to="/reservation"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl bg-brand-blue-600 px-4 py-4 text-center text-base font-bold text-white hover:bg-brand-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Réserver mon taxi santé
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
