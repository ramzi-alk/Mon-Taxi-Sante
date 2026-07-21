import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin } from "lucide-react";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_EMAIL } from "~/lib/contact";
// Fichier dédié (30 villes) plutôt que ~/lib/seoData : ce module est chargé
// sur TOUTES les pages (Footer est dans le layout racine) — importer
// seoData.ts embarquerait les 5509 communes + 7474 hôpitaux dans le bundle
// client de chaque page.
import topCommunesData from "~/data/seo/top-communes.json";

const topCommunes = topCommunesData.slice(0, 16);

const footerLinks = {
  services: [
    { to: "/reservation", label: "Réserver un taxi" },
    { to: "/comment-ca-marche", label: "Comment ça marche" },
    { to: "/tarifs-cpam", label: "Tarifs et remboursements" },
    { to: "/faq", label: "Questions fréquentes" },
  ],
  professionnels: [
    { to: "/chauffeurs/inscription", label: "Devenir chauffeur partenaire" },
    { to: "/chauffeurs/tarifs", label: "Abonnements chauffeurs" },
  ],
  ressources: [
    { to: "/blog", label: "Guides patients" },
    { to: "/blog/transport-cpam", label: "Transport pris en charge Assurance Maladie" },
    { to: "/blog/pmt-prescription", label: "Prescription médicale de transport" },
    { to: "/blog/ald-transport", label: "Transport ALD : tout savoir" },
    { to: "/maladies", label: "Transport par pathologie (ALD)" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#0B0F1C] text-gray-400" role="contentinfo">
      <div className="container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-5">
              <img
                src="/brand/docteur-taxi-logo-light.svg"
                alt="Docteur Taxi"
                className="h-16 w-auto"
              />
            </div>
            <p className="text-sm leading-relaxed text-gray-500 mb-6">
              La plateforme de réservation de taxis conventionnés agréée
              Sécurité Sociale. Concentrez-vous sur votre santé — nous gérons
              le reste.
            </p>
            <div className="space-y-2.5 text-sm">
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
                aria-label={`Nous appeler au ${CONTACT_PHONE_DISPLAY}`}
              >
                <Phone className="h-4 w-4 text-[#1244E8]" aria-hidden="true" />
                {CONTACT_PHONE_DISPLAY} (gratuit)
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2 hover:text-white transition-colors"
                aria-label="Nous envoyer un email"
              >
                <Mail className="h-4 w-4 text-[#1244E8]" aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
              <span className="flex items-center gap-2">
                <MapPin
                  className="h-4 w-4 text-[#1244E8] shrink-0"
                  aria-hidden="true"
                />
                Disponible partout en France métropolitaine
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">
              Patients
            </h3>
            <ul className="space-y-3 list-none" role="list">
              {footerLinks.services.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Professionnels */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">
              Professionnels
            </h3>
            <ul className="space-y-3 list-none" role="list">
              {footerLinks.professionnels.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">
              Ressources Assurance Maladie
            </h3>
            <ul className="space-y-3 list-none" role="list">
              {footerLinks.ressources.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Villes principales — maillage interne SEO */}
        <div className="mt-14 border-t border-white/5 pt-10">
          <h3 className="font-semibold text-white mb-5 text-sm uppercase tracking-wider">
            Villes principales
          </h3>
          <ul className="flex flex-wrap gap-x-6 gap-y-3 list-none" role="list">
            {topCommunes.map((commune) => (
              <li key={commune.codeInsee}>
                <Link
                  to="/$department/$city"
                  params={{ department: commune.departementSlug, city: commune.slug }}
                  className="text-sm hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  Taxi conventionné {commune.nom}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/villes"
                className="text-sm font-semibold text-[#1244E8] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Toutes les villes →
              </Link>
            </li>
          </ul>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Docteur Taxi. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Link
              to="/mentions-legales"
              className="hover:text-gray-300 transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              to="/confidentialite"
              className="hover:text-gray-300 transition-colors"
            >
              Confidentialité & RGPD
            </Link>
            <Link
              to="/cgv"
              className="hover:text-gray-300 transition-colors"
            >
              CGV
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
