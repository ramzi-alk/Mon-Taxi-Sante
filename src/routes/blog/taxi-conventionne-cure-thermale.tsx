import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/taxi-conventionne-cure-thermale")({
  head: () => ({
    meta: [
      { title: "Cure Thermale : Remboursement du Taxi Conventionné — Docteur Taxi" },
      {
        name: "description",
        content:
          "Les règles strictes de la CPAM pour le remboursement du transport vers une cure thermale : conditions de ressources et prise en charge expliquées.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://docteurtaxi.fr/blog/taxi-conventionne-cure-thermale" },
    ],
  }),
  component: TaxiConventionneCureThermaleArticle,
});

const faqItems = [
  {
    q: "Puis-je bénéficier du Tiers-Payant intégral pour mon trajet vers une cure thermale ?",
    a: "Généralement non. Le transport pour une cure thermale étant remboursé sur la base d'un billet de train et soumis à condition de ressources, le mécanisme classique du Tiers-Payant sans avance de frais applicable aux soins hospitaliers ne s'applique quasiment jamais aux cures.",
  },
  {
    q: "Où trouver le plafond de ressources exact pour le remboursement du transport ?",
    a: "Ce plafond est réévalué chaque année. Vous pouvez le consulter sur votre compte Ameli ou en contactant votre caisse primaire d'assurance maladie avant de faire votre demande d'accord de prise en charge.",
  },
];

function TaxiConventionneCureThermaleArticle() {
  return (
    <BlogLayout
      category="Prise en charge"
      slug="taxi-conventionne-cure-thermale"
      title="Cure thermale : le transport en taxi conventionné est-il remboursé ?"
      readingTime="4 min"
      publishedAt="14 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Chaque année, de nombreux patients se voient prescrire une cure
        thermale pour soulager des rhumatismes, des affections respiratoires
        ou des problèmes dermatologiques. Si la prise en charge des soins
        prodigués sur place est bien encadrée par la Sécurité sociale, la
        question du déplacement vers la station thermale est souvent source
        de confusion : les règles de la CPAM pour les cures sont
        fondamentalement différentes, et bien plus restrictives, que pour un
        rendez-vous à l'hôpital.
      </p>

      <h2>Les conditions de ressources obligatoires</h2>
      <p>
        Contrairement à un trajet vers un hôpital ou un centre de dialyse, le
        remboursement de vos frais de transport pour une cure thermale n'est
        pas automatique : il est soumis à un plafond de ressources
        financières, réévalué annuellement. Si vos revenus dépassent ce
        plafond, l'intégralité de vos frais de transport reste à votre
        charge, que vous ayez une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        ou non. L'exception concerne les cures directement liées à un{" "}
        <Link to="/blog/taxi-conventionne-accident-travail">
          accident du travail ou une maladie professionnelle
        </Link>
        .
      </p>

      <h2>Une base de remboursement plafonnée</h2>
      <p>
        Même en remplissant les conditions de ressources, la Sécurité sociale
        ne rembourse pas le transport thermal sur la base du compteur d'un
        taxi conventionné : elle limite sa prise en charge à 65 % du tarif
        d'un billet de train SNCF 2ème classe aller-retour, quelle que soit
        la somme réellement dépensée. Si vous empruntez un taxi conventionné
        pour une station thermale à plusieurs centaines de kilomètres, le
        coût réel de la course sera largement supérieur à cette base de
        remboursement — un reste à charge important, sauf forfait cure
        avantageux prévu par votre mutuelle.
      </p>

      <h2>L'accord préalable de la Sécurité sociale</h2>
      <p>
        Vous devez effectuer une demande de prise en charge avant le début de
        votre cure. C'est votre médecin traitant qui remplit le formulaire de
        demande d'accord préalable spécifique au thermalisme. En retour, la
        CPAM renvoie un formulaire de prise en charge dont le volet 3 est
        dédié aux frais de transport et d'hébergement. Sans ce document,
        aucun remboursement n'est possible.
      </p>

      <h2>Le taxi conventionné est-il la bonne solution pour une cure ?</h2>
      <p>
        Dans la très grande majorité des cas, réserver un taxi conventionné
        pour une cure thermale n'est pas le mode de transport le plus adapté
        financièrement, car le{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Tiers-Payant intégral
        </Link>{" "}
        ne s'applique pas à ce type de séjour. Le transport assis
        professionnalisé ne s'envisage que pour des situations
        exceptionnelles : un patient en{" "}
        <Link to="/blog/ald-transport">
          Affection de Longue Durée
        </Link>{" "}
        justifiant une incapacité totale à utiliser les transports en commun,
        et respectant les plafonds de ressources. Avant d'engager le moindre
        frais pour votre cure, contactez le service médical de votre CPAM
        pour valider vos droits exacts.
      </p>
    </BlogLayout>
  );
}
