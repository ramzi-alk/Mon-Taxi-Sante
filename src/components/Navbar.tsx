import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { trackCallButtonClick } from "~/lib/trackCallClick";
import { usePhoneVisibility } from "~/hooks/usePhoneVisibility";

const navLinks = [
  { to: "/comment-ca-marche", label: "Comment ça marche" },
  { to: "/blog", label: "Guides patients" },
  { to: "/mes-reservations", label: "Suivre ma réservation" },
  { to: "/connexion", label: "Espace chauffeur" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const phoneVisible = usePhoneVisibility();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      <nav aria-label="Navigation principale">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
            aria-label="Docteur Taxi — Accueil"
          >
            <img
              src="/brand/docteur-taxi-logo.svg"
              alt=""
              className="h-11 w-auto sm:h-12"
            />
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-8 list-none" role="list">
            {navLinks.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="text-sm font-medium text-gray-500 hover:text-[#0B0F1C] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA zone */}
          <div className="hidden md:flex items-center gap-4">
            {phoneVisible && (
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                onClick={() => trackCallButtonClick("navbar")}
                className="text-sm font-medium text-gray-500 hover:text-[#0B0F1C] transition-colors"
                aria-label={`Appeler le ${CONTACT_PHONE_DISPLAY} (gratuit)`}
              >
                {CONTACT_PHONE_DISPLAY}
              </a>
            )}
            <Link
              to="/reservation"
              className="btn-cta bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Réserver mon taxi maintenant"
            >
              Réserver
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
                    className="block rounded-lg px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="pt-2">
                <Link
                  to="/reservation"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-full bg-[#0B0F1C] px-4 py-4 text-center text-base font-bold text-white hover:bg-[#1244E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Réserver mon taxi
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
