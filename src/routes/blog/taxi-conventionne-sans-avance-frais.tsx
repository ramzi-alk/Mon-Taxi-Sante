import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute(
  "/blog/taxi-conventionne-sans-avance-frais",
)({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné : Zéro Avance de Frais — Docteur Taxi" },
      {
        name: "description",
        content:
          "Comment bénéficier d'un taxi conventionné remboursé sans avance de frais ? Le fonctionnement concret du Tiers-Payant et les documents à préparer.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://docteurtaxi.fr/blog/taxi-conventionne-sans-avance-frais",
      },
    ],
  }),
  component: TaxiConventionneSansAvanceFraisArticle,
});

const faqItems = [
  {
    q: "Dois-je avancer les frais si je n'ai pas ma prescription (PMT) le jour du transport ?",
    a: "Oui. Sans la Prescription Médicale de Transport originale signée par votre médecin avant le trajet, le chauffeur ne peut pas appliquer le Tiers-Payant : le trajet reste entièrement à votre charge.",
  },
  {
    q: "Le Tiers-Payant s'applique-t-il avec toutes les mutuelles ?",
    a: "Les chauffeurs conventionnés acceptent la grande majorité des mutuelles. Si votre prise en charge est à 65 %, la part restante est télétransmise à votre complémentaire santé pour garantir le zéro avance de frais.",
  },
  {
    q: "Je bénéficie de la Complémentaire Santé Solidaire (CSS), dois-je payer quelque chose ?",
    a: "Non. Si vous êtes bénéficiaire de la Complémentaire Santé Solidaire ou de l'Aide Médicale de l'État, vos frais de transport sanitaire sur prescription sont pris en charge à 100 %, sans aucune avance.",
  },
  {
    q: "Puis-je donner une photocopie de ma prescription au chauffeur ?",
    a: "Non. L'Assurance Maladie exige que le chauffeur récupère l'original de la Prescription Médicale de Transport pour pouvoir facturer la course et vous éviter l'avance des frais. Conservez une copie pour vos dossiers si vous le souhaitez.",
  },
];

function TaxiConventionneSansAvanceFraisArticle() {
  return (
    <BlogLayout
      category="Prise en charge"
      slug="taxi-conventionne-sans-avance-frais"
      title="Taxi conventionné : comment être remboursé sans avancer les frais ?"
      readingTime="4 min"
      publishedAt="5 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Sous certaines conditions, l'Assurance Maladie couvre vos
        déplacements médicaux — mais encore faut-il ne pas avoir à avancer
        l'argent avant d'être remboursé. Grâce au Tiers-Payant, un taxi
        conventionné peut vous transporter sans que vous ayez rien à régler
        sur place. Voici concrètement comment ce mécanisme fonctionne et ce
        qu'il faut préparer pour qu'il s'applique le jour J.
      </p>

      <h2>Qu'est-ce que le Tiers-Payant pour un transport sanitaire ?</h2>
      <p>
        Lors d'une consultation classique, vous payez d'abord le praticien
        puis êtes remboursé quelques jours plus tard. Le Tiers-Payant vous
        dispense de cette avance : le chauffeur de taxi conventionné se fait
        payer directement par l'Assurance Maladie, et le cas échéant votre
        mutuelle, après la course. À la fin du trajet, vous descendez du
        véhicule sans sortir votre carte bancaire.
      </p>

      <h2>Les 3 conditions pour que le zéro avance de frais s'applique</h2>
      <p>
        Pour que le chauffeur puisse appliquer le Tiers-Payant, trois éléments
        doivent être réunis au moment de votre montée dans le véhicule :
      </p>
      <ul>
        <li>
          <strong>Une Prescription Médicale de Transport</strong> : ce{" "}
          <Link to="/blog/pmt-prescription">bon de transport</Link> doit être
          rempli, signé et daté par votre médecin avant la réalisation du
          trajet.
        </li>
        <li>
          <strong>Des droits à jour</strong> : votre situation doit être à
          jour auprès de l'Assurance Maladie (carte Vitale à jour ou
          attestation de droits valide).
        </li>
        <li>
          <strong>Un taxi officiellement conventionné</strong> : le
          Tiers-Payant n'est possible qu'avec un chauffeur disposant d'un
          conventionnement CPAM, ce que garantissent tous les chauffeurs
          partenaires de Docteur Taxi.
        </li>
      </ul>
      <p>
        Cela vaut aussi bien en cas de prise en charge à 100 % qu'à 65 % — le
        détail des situations concernées par chaque taux est expliqué dans
        notre guide{" "}
        <Link to="/blog/transport-cpam">
          Transport pris en charge Assurance Maladie
        </Link>
        . À 65 %, le chauffeur télétransmet simultanément la part de la CPAM
        et celle de votre mutuelle : vous n'avez rien à avancer non plus dans
        ce cas.
      </p>

      <h2>Quels documents remettre au chauffeur ?</h2>
      <p>
        Pour garantir la fluidité de la démarche et éviter de régler la
        course, préparez le jour du trajet :
      </p>
      <ol>
        <li>votre carte Vitale (ou votre attestation papier de droits) ;</li>
        <li>
          l'original de votre Prescription Médicale de Transport — le
          chauffeur doit le conserver pour se faire payer par l'Assurance
          Maladie ;
        </li>
        <li>
          votre carte de mutuelle de l'année en cours, si vous êtes pris en
          charge à 65 %.
        </li>
      </ol>

      <h2>Que se passe-t-il si un document manque ?</h2>
      <p>
        Sans PMT originale, sans droits à jour ou avec un taxi non
        conventionné, le chauffeur ne peut pas facturer l'Assurance Maladie :
        le trajet est alors à votre charge, au tarif en vigueur, et une
        demande de remboursement a posteriori auprès de votre CPAM n'est pas
        garantie. Lors de votre réservation sur Docteur Taxi, nous vérifions
        systématiquement avec vous que ces documents sont réunis avant le
        jour du rendez-vous.
      </p>
    </BlogLayout>
  );
}
