import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute(
  "/blog/taxi-conventionne-dimanche-nuit-jour-ferie",
)({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné Nuit et Dimanche — Docteur Taxi" },
      {
        name: "description",
        content:
          "Besoin d'un taxi conventionné la nuit, un dimanche ou un jour férié ? Les règles de la CPAM et comment réserver sans avance de frais.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/taxi-conventionne-dimanche-nuit-jour-ferie"),
  }),
  component: TaxiConventionneDimancheNuitJourFerieArticle,
});

const faqItems = [
  {
    q: "À partir de quelle heure s'applique le tarif de nuit pour un taxi médicalisé ?",
    a: "La plage horaire de nuit dépend des arrêtés préfectoraux de chaque département. De manière générale, le tarif de nuit s'applique de 19h à 7h du matin, ainsi que toute la journée les dimanches et jours fériés.",
  },
  {
    q: "Ma prescription médicale doit-elle préciser que le transport a lieu le week-end ?",
    a: "Non. La date de vos soins inscrite sur la Prescription Médicale de Transport justifie d'elle-même la réalisation de la course un jour non ouvré.",
  },
  {
    q: "Le chauffeur peut-il me demander de payer la différence pour le tarif de nuit ?",
    a: "Non. Si vos documents sont à jour (PMT, carte Vitale, mutuelle), le Tiers-Payant couvre la totalité du tarif réglementé, majorations de nuit ou de dimanche incluses. Vous ne payez aucun supplément.",
  },
];

function TaxiConventionneDimancheNuitJourFerieArticle() {
  return (
    <BlogLayout
      category="Prise en charge"
      slug="taxi-conventionne-dimanche-nuit-jour-ferie"
      title="Taxi conventionné la nuit ou le dimanche : est-ce possible ?"
      readingTime="4 min"
      publishedAt="15 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        La maladie et les besoins de soins ne s'arrêtent pas le vendredi
        soir : admission hospitalière un dimanche après-midi avant une
        intervention, séance de dialyse tôt le matin, retour à domicile
        tardif après des examens prolongés. Est-il possible de bénéficier
        d'un taxi conventionné la nuit, le dimanche ou un jour férié ? La
        réponse est oui, mais l'Assurance Maladie applique des règles de
        tarification spécifiques.
      </p>

      <h2>La continuité des transports sanitaires</h2>
      <p>
        Les chauffeurs de taxi conventionné peuvent assurer des prises en
        charge la nuit, les dimanches et les jours fériés. Tant que vous
        êtes en possession d'une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        valide pour la date concernée, votre droit au déplacement médicalisé
        est garanti, quel que soit le jour du calendrier.
      </p>

      <h2>Tarifs majorés de la CPAM</h2>
      <p>
        Si vous empruntez un taxi conventionné durant un week-end ou en
        pleine nuit, le montant affiché au taximètre grimpe plus vite qu'en
        journée de semaine — c'est normal et légal. Une tarification majorée
        s'applique pour les horaires de nuit (généralement 19h-7h) ainsi que
        pour les dimanches et jours fériés, fixée par arrêté préfectoral et
        destinée à compenser les horaires décalés des chauffeurs. Cette
        hausse du tarif de base ne modifie en rien vos droits de patient.
      </p>

      <h2>Aucun reste à charge pour le patient</h2>
      <p>
        Le principe du{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Tiers-Payant et de l'absence d'avance de frais
        </Link>{" "}
        s'applique strictement de la même manière qu'en pleine journée. Pris
        en charge à 100 % (par exemple en{" "}
        <Link to="/blog/ald-transport">
          Affection de Longue Durée
        </Link>
        ), la Sécurité sociale règle l'intégralité de la course majorée
        directement au chauffeur. Au régime standard à 65 %, elle se partage
        le montant avec votre mutuelle. Dans tous les cas, vous ne payez
        aucun supplément de votre poche.
      </p>

      <h2>L'importance de l'anticipation</h2>
      <p>
        Le service est autorisé et remboursé, mais le nombre de chauffeurs
        en activité la nuit ou le dimanche est logiquement plus restreint
        qu'en semaine, et les véhicules disponibles sont souvent très
        sollicités. Dès que vous connaissez la date et l'heure de votre
        convocation ou de votre admission, planifiez votre trajet sur la
        plateforme Docteur Taxi : nous mobilisons un chauffeur partenaire
        disponible sur ce créneau atypique.
      </p>
    </BlogLayout>
  );
}
