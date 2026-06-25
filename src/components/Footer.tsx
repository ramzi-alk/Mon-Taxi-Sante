import { Link } from "@tanstack/react-router";
import { Heart, Phone, Mail, MapPin } from "lucide-react";

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
    { to: "/admin", label: "Espace admin" },
  ],
  ressources: [
    { to: "/blog", label: "Guides patients" },
    { to: "/blog/transport-cpam", label: "Transport pris en charge CPAM" },
    { to: "/blog/pmt-prescription", label: "Prescription médicale de transport" },
    { to: "/blog/ald-transport", label: "Transport ALD : tout savoir" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300" role="contentinfo">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue-600 text-white font-bold text-lg">
                M
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-white text-lg">Mon Taxi</span>
                <span className="text-brand-green-500 font-semibold text-sm -mt-0.5">Santé</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-400 mb-6">
              La plateforme de réservation de taxis conventionnés agréée Sécurité Sociale.
              Concentrez-vous sur votre santé — nous gérons le reste.
            </p>
            <div className="space-y-2 text-sm">
              <a
                href="tel:+33800000000"
                className="flex items-center gap-2 hover:text-white transition-colors"
                aria-label="Nous appeler"
              >
                <Phone className="h-4 w-4 text-brand-blue-400" aria-hidden="true" />
                0800 000 000 (gratuit)
              </a>
              <a
                href="mailto:contact@mon-taxi-sante.fr"
                className="flex items-center gap-2 hover:text-white transition-colors"
                aria-label="Nous envoyer un email"
              >
                <Mail className="h-4 w-4 text-brand-blue-400" aria-hidden="true" />
                contact@mon-taxi-sante.fr
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-blue-400 shrink-0" aria-hidden="true" />
                Disponible partout en France métropolitaine
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-white mb-4">Patients</h3>
            <ul className="space-y-2.5 list-none" role="list">
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
            <h3 className="font-semibold text-white mb-4">Professionnels</h3>
            <ul className="space-y-2.5 list-none" role="list">
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
            <h3 className="font-semibold text-white mb-4">Ressources CPAM</h3>
            <ul className="space-y-2.5 list-none" role="list">
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

        {/* Bottom bar */}
        <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} Mon Taxi Santé. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/mentions-legales" className="hover:text-gray-300 transition-colors">
              Mentions légales
            </Link>
            <Link to="/confidentialite" className="hover:text-gray-300 transition-colors">
              Confidentialité & RGPD
            </Link>
            <Link to="/cgv" className="hover:text-gray-300 transition-colors">
              CGV
            </Link>
          </div>
          <p className="flex items-center gap-1">
            Fait avec{" "}
            <Heart className="h-3 w-3 fill-red-400 text-red-400" aria-label="amour" />{" "}
            pour les patients français
          </p>
        </div>
      </div>
    </footer>
  );
}
