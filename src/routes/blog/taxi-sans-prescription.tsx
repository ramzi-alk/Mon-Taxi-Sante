import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/taxi-sans-prescription")({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné Sans Prescription : Est-ce Possible ? — Docteur Taxi" },
      {
        name: "description",
        content:
          "Puis-je réserver un taxi conventionné sans Prescription Médicale de Transport ? Ce qui change pour votre remboursement et comment régulariser votre dossier.",
      },
    ],
    links: [{ rel: "canonical", href: "https://mon-taxi-sante.com/blog/taxi-sans-prescription" }],
  }),
  component: TaxiSansPrescriptionArticle,
});

const faqItems = [
  {
    q: "Puis-je réserver un taxi conventionné sans PMT ?",
    a: "Oui, vous pouvez réserver sans Prescription Médicale de Transport (PMT). Le transport sera alors à votre charge jusqu'à ce que vous puissiez fournir le document, ou remboursé a posteriori selon les modalités de votre caisse d'assurance maladie.",
  },
  {
    q: "Que se passe-t-il si je n'ai pas de PMT le jour du transport ?",
    a: "Le chauffeur facture la course au tarif conventionné, mais elle reste à votre charge : elle n'est pas transmise à l'Assurance Maladie en Tiers-Payant. Vous réglez directement le montant, comme pour un taxi classique.",
  },
  {
    q: "Puis-je me faire rembourser après coup si j'obtiens la PMT plus tard ?",
    a: "C'est possible dans certains cas, en conservant votre facture et en adressant une demande de remboursement à votre caisse d'assurance maladie avec la PMT obtenue a posteriori. Les modalités et délais dépendent de votre caisse.",
  },
  {
    q: "Comment obtenir une PMT si je n'en ai pas encore ?",
    a: "Seul un médecin peut établir une PMT : votre médecin traitant, un médecin hospitalier ou le spécialiste qui vous suit. Demandez-la avant votre transport chaque fois que votre état de santé le justifie.",
  },
  {
    q: "Puis-je réserver en urgence sans attendre la prescription ?",
    a: "Oui. Vous pouvez réserver immédiatement et joindre votre PMT plus tard dans votre espace de réservation, ou la présenter au chauffeur le jour du transport avec votre carte Vitale.",
  },
];

function TaxiSansPrescriptionArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="taxi-sans-prescription"
      title="Taxi conventionné sans prescription médicale : est-ce possible ?"
      readingTime="3 min"
      publishedAt="21 juillet 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Vous avez besoin d'un taxi conventionné mais vous n'avez pas encore de
        Prescription Médicale de Transport (PMT) en main ? C'est une situation
        fréquente : voici ce qui change pour votre remboursement, et comment
        régulariser votre dossier sans retarder votre trajet.
      </p>

      <h2>Puis-je réserver un taxi conventionné sans PMT ?</h2>
      <p>
        Oui, vous pouvez réserver sans PMT. Le transport sera alors à votre
        charge jusqu'à ce que vous puissiez fournir le document, ou remboursé
        a posteriori selon les modalités de votre caisse d'assurance maladie.
        L'absence de prescription ne bloque pas la réservation, elle change
        uniquement la prise en charge financière.
      </p>

      <h2>Que se passe-t-il concrètement le jour du transport ?</h2>
      <p>
        Sans PMT valide, le chauffeur facture la course au tarif conventionné,
        mais elle reste à votre charge : elle n'est pas transmise à
        l'Assurance Maladie en Tiers-Payant. Vous réglez directement le
        montant, comme pour un taxi classique, au tarif de la{" "}
        <Link to="/tarifs-cpam">convention nationale taxi 2025</Link>.
      </p>

      <h2>Puis-je me faire rembourser après coup ?</h2>
      <p>
        C'est possible dans certains cas : conservez votre facture et adressez
        une demande de remboursement à votre caisse d'assurance maladie
        accompagnée de la PMT obtenue a posteriori, si votre médecin l'établit
        après le trajet. Les modalités et délais de traitement dépendent de
        votre caisse.
      </p>

      <h2>Comment obtenir une PMT ?</h2>
      <p>
        Seul un médecin peut établir une PMT : votre médecin traitant, un
        médecin hospitalier ou le spécialiste qui vous suit pour votre
        pathologie. Demandez-la systématiquement avant le transport dès que
        votre état de santé le justifie — c'est la condition pour bénéficier
        du Tiers-Payant. Le détail complet de la démarche est expliqué dans
        notre guide{" "}
        <Link to="/blog/pmt-prescription">
          Prescription médicale de transport (PMT) : mode d'emploi
        </Link>
        .
      </p>

      <h2>Dois-je attendre d'avoir la PMT pour réserver ?</h2>
      <p>
        Non. Vous pouvez réserver immédiatement votre taxi conventionné et
        joindre votre PMT dès que vous l'obtenez, ou la présenter directement
        au chauffeur avec votre carte Vitale le jour du transport. Mieux vaut
        réserver dès maintenant et régulariser ensuite, plutôt que de retarder
        un rendez-vous médical en attendant un document.
      </p>
    </BlogLayout>
  );
}
