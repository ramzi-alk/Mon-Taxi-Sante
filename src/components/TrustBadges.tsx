import { ShieldCheck, CreditCard, BadgeCheck, Lock } from "lucide-react";
import { cn } from "~/lib/utils";

interface Badge {
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const badges: Badge[] = [
  {
    icon: ShieldCheck,
    title: "Agréé Sécurité Sociale",
    description: "Tous nos chauffeurs sont conventionnés CPAM. Votre trajet est reconnu par l'Assurance Maladie.",
    color: "text-brand-blue-600",
    bgColor: "bg-brand-blue-50",
  },
  {
    icon: CreditCard,
    title: "Zéro avance de frais",
    description: "Grâce au Tiers-Payant, vous ne payez rien. La Sécurité Sociale règle directement le chauffeur.",
    color: "text-brand-green-600",
    bgColor: "bg-brand-green-50",
  },
  {
    icon: BadgeCheck,
    title: "Chauffeurs certifiés",
    description: "Chaque chauffeur est vérifié : convention CPAM valide, formation, véhicule aux normes et assurance à jour.",
    color: "text-brand-blue-600",
    bgColor: "bg-brand-blue-50",
  },
  {
    icon: Lock,
    title: "Données médicales sécurisées",
    description: "Hébergement HDS certifié. Vos informations de santé sont chiffrées et protégées conformément au RGPD.",
    color: "text-brand-green-600",
    bgColor: "bg-brand-green-50",
  },
];

interface TrustBadgesProps {
  className?: string;
  variant?: "grid" | "row";
}

export function TrustBadges({ className, variant = "grid" }: TrustBadgesProps) {
  return (
    <section
      aria-labelledby="trust-badges-heading"
      className={cn("section-medical bg-gray-50", className)}
    >
      <div className="container">
        <div className="text-center mb-12">
          <h2
            id="trust-badges-heading"
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            Pourquoi choisir Mon Taxi Santé&nbsp;?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Un service conçu avec les patients, pour les patients.
            Simple, humain, et entièrement pris en charge.
          </p>
        </div>

        <ul
          className={cn(
            "list-none grid gap-6",
            variant === "grid"
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : "sm:grid-cols-2 lg:grid-cols-4"
          )}
          role="list"
          aria-label="Nos garanties"
        >
          {badges.map(({ icon: Icon, title, description, color, bgColor }) => (
            <li
              key={title}
              className="group flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 hover:shadow-md hover:ring-brand-blue-100 transition-all duration-200"
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  bgColor
                )}
                aria-hidden="true"
              >
                <Icon className={cn("h-6 w-6", color)} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-base mb-1.5">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* CPAM logo strip */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 opacity-60">
          <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
            Reconnu par
          </span>
          {["Assurance Maladie", "CPAM", "ARS", "HDS"].map((org) => (
            <span
              key={org}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600"
            >
              {org}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
