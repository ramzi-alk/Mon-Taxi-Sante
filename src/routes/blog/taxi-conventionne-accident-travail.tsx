import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute(
  "/blog/taxi-conventionne-accident-travail",
)({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné et Accident du Travail — Docteur Taxi" },
      {
        name: "description",
        content:
          "Victime d'un accident du travail ou d'une maladie professionnelle ? Comment réserver un taxi conventionné pris en charge à 100 %, sans avance de frais.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://docteurtaxi.fr/blog/taxi-conventionne-accident-travail",
      },
    ],
  }),
  component: TaxiConventionneAccidentTravailArticle,
});

const faqItems = [
  {
    q: "La CPAM n'a pas encore reconnu officiellement mon accident du travail, puis-je prendre le taxi ?",
    a: "Pendant l'instruction de votre dossier, vos transports prescrits sont pris en charge aux conditions habituelles (le plus souvent 65 %, avec complément de la mutuelle). Le Tiers-Payant s'applique sur ces bases, en attendant la décision de prise en charge à 100 %.",
  },
  {
    q: "Puis-je utiliser un taxi conventionné pour une rechute de mon accident du travail ?",
    a: "Oui. En cas de rechute liée à l'accident initial, avec une prescription pour un transport assis professionnalisé, vous bénéficiez des mêmes droits de prise en charge à 100 %.",
  },
  {
    q: "Le taxi peut-il m'emmener à la pharmacie pour récupérer mes médicaments liés à l'accident ?",
    a: "Non. Le transport pris en charge couvre les trajets vers un lieu de soins ou d'examens (hôpital, spécialiste, imagerie, kinésithérapeute) : un arrêt à la pharmacie n'est pas couvert par la CPAM.",
  },
  {
    q: "Qu'est-ce que la feuille d'accident du travail ?",
    a: "C'est un formulaire remis par votre employeur (ou votre caisse pour une maladie professionnelle) dès la déclaration. Il permet aux professionnels de santé et aux transporteurs sanitaires d'appliquer directement la prise en charge à 100 %.",
  },
];

function TaxiConventionneAccidentTravailArticle() {
  return (
    <BlogLayout
      category="Prise en charge"
      slug="taxi-conventionne-accident-travail"
      title="Accident du travail et taxi conventionné : prise en charge"
      readingTime="5 min"
      publishedAt="10 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Être victime d'un accident du travail, d'un accident de trajet ou
        d'une maladie professionnelle entraîne souvent une période de soins
        intenses : chirurgie, consultations de contrôle, rééducation
        kinésithérapique, expertises médicales. Comment fonctionne la prise
        en charge de vos trajets en taxi conventionné dans ce cadre, et
        quels documents présenter pour ne rien payer ?
      </p>

      <h2>Un transport pris en charge à 100 %</h2>
      <p>
        Contrairement au régime standard où la CPAM rembourse 65 % des frais
        de transport sanitaire, les soins et déplacements en lien direct avec
        un accident du travail ou une maladie professionnelle sont pris en
        charge à 100 % sur la base du tarif de la Sécurité sociale — sur le
        même principe d'exonération que pour une{" "}
        <Link to="/blog/ald-transport">
          Affection de Longue Durée
        </Link>
        . Le Tiers-Payant s'applique intégralement : vous n'avez aucun
        centime à avancer au chauffeur.
      </p>

      <h2>Une prescription qui doit mentionner l'accident du travail</h2>
      <p>
        Vos droits sont ouverts à 100 %, mais l'utilisation d'un taxi
        conventionné reste soumise à une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        établie avant chaque trajet. La particularité ici : le médecin doit,
        en plus de cocher « Transport assis professionnalisé », indiquer
        explicitement que le transport est en lien avec votre accident du
        travail — généralement en cochant la case AT/MP du formulaire.
      </p>

      <h2>Le document clé : la feuille d'accident du travail</h2>
      <p>
        C'est ici que la démarche diffère du parcours de soins classique. En
        plus de l'original de votre PMT et de votre carte Vitale (voir notre
        guide{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Taxi conventionné : zéro avance de frais
        </Link>{" "}
        pour le détail de cette checklist), vous devez présenter au chauffeur
        la <strong>feuille d'accident du travail ou de maladie
        professionnelle</strong>. Ce volet papier, remis par votre employeur
        lors de la déclaration du sinistre, comporte les références exactes
        de votre dossier (date de l'accident, numéro de dossier)
        indispensables pour la facturation en Tiers-Payant à 100 %.
      </p>

      <h2>Convocations, expertises et appareillage</h2>
      <p>
        Le taxi conventionné est aussi pris en charge pour des déplacements
        liés au suivi administratif de votre dossier : convocation du
        contrôle médical de la Sécurité sociale (médecin-conseil), expertise
        médicale demandée par les tribunaux ou un médecin expert, ou
        déplacement chez un fournisseur d'appareillage (orthopédiste,
        prothésiste) pour la fourniture ou la réparation d'une prothèse liée
        à votre accident. Pour une convocation officielle de la CPAM, le
        courrier de convocation fait souvent office de prescription de
        transport — vérifiez les instructions qui y figurent.
      </p>

      <h2>Réserver votre trajet pour vos soins AT/MP</h2>
      <p>
        Que ce soit pour une consultation de contrôle ponctuelle ou pour
        organiser une série de séances de rééducation, munissez-vous de
        votre prescription et planifiez vos trajets en précisant qu'il
        s'agit d'un accident du travail. Nos chauffeurs partenaires
        s'adaptent aux contraintes physiques temporaires (béquilles,
        attelles) pour un transport confortable et sans avance de frais.
      </p>
    </BlogLayout>
  );
}
