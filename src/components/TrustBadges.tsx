import { ShieldCheck, CreditCard, BadgeCheck, Lock } from "lucide-react";
import { cn } from "~/lib/utils";

interface Badge {
  icon: React.FC<{ className?: string }>;
  title: string;
  description: string;
}

const badges: Badge[] = [
  {
    icon: ShieldCheck,
    title: "Agréé Sécurité Sociale",
    description:
      "Tous nos chauffeurs sont conventionnés par l'Assurance Maladie. Votre trajet est intégralement reconnu pour le remboursement.",
  },
  {
    icon: CreditCard,
    title: "Zéro avance de frais",
    description:
      "Grâce au Tiers-Payant, vous ne payez rien. La Sécurité Sociale règle directement le chauffeur.",
  },
  {
    icon: BadgeCheck,
    title: "Chauffeurs certifiés",
    description:
      "Convention Assurance Maladie valide, formation, véhicule aux normes et assurance à jour. Tous vérifiés.",
  },
  {
    icon: Lock,
    title: "Données médicales sécurisées",
    description:
      "Hébergement HDS certifié. Vos informations de santé sont chiffrées et protégées (RGPD).",
  },
];

interface TrustBadgesProps {
  className?: string;
}

export function TrustBadges({ className }: TrustBadgesProps) {
  return (
    <section
      aria-labelledby="trust-badges-heading"
      className={cn("bg-white border-y border-gray-100", className)}
    >
      <div className="container py-16 md:py-20">
        <div className="mb-12">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-4">
            Nos garanties
          </p>
          <h2
            id="trust-badges-heading"
            className="text-4xl md:text-5xl font-black text-[#0B0F1C] tracking-tight leading-tight"
          >
            Pourquoi choisir<br />
            Docteur Taxi&nbsp;?
          </h2>
        </div>

        {/* Editorial grid — hairline separators between cells */}
        <ul
          className="list-none grid sm:grid-cols-2 lg:grid-cols-4 border border-gray-100 divide-x divide-y divide-gray-100"
          role="list"
          aria-label="Nos garanties"
        >
          {badges.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex flex-col gap-5 bg-white p-8 hover:bg-gray-50/70 transition-colors"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEF2FF]">
                <Icon className="h-5 w-5 text-[#1244E8]" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-[#0B0F1C] text-base mb-2">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Compliance strip */}
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <span className="text-xs font-bold tracking-[0.12em] text-gray-300 uppercase">
            Conformité
          </span>
          {["Conventionné Assurance Maladie", "Hébergement HDS", "RGPD"].map((org) => (
            <span
              key={org}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500"
            >
              {org}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
