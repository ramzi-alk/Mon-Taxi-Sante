import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/pmt-prescription")({
  head: () => ({
    meta: [
      {
        title:
          "PMT : Prescription Médicale de Transport, Mode d'Emploi — Docteur Taxi",
      },
      {
        name: "description",
        content:
          "Qu'est-ce qu'une PMT, qui peut la délivrer, sa durée de validité et comment la joindre à votre réservation de taxi conventionné pour être remboursé sans avance de frais.",
      },
    ],
    links: [{ rel: "canonical", href: "https://mon-taxi-sante.com/blog/pmt-prescription" }],
  }),
  component: PmtPrescriptionArticle,
});

const faqItems = [
  {
    q: "Qu'est-ce qu'une PMT ?",
    a: "La Prescription Médicale de Transport (PMT) est un document établi par un médecin attestant que votre état de santé justifie le recours à un transport sanitaire (taxi conventionné, VSL ou ambulance) pour vous rendre à vos soins. Elle est indispensable pour bénéficier d'une prise en charge par l'Assurance Maladie.",
  },
  {
    q: "Qui peut délivrer une PMT ?",
    a: "Seul un médecin peut établir une PMT : médecin traitant, médecin hospitalier ou médecin spécialiste suivant votre pathologie. La prescription doit être faite avant le transport, sauf cas d'urgence.",
  },
  {
    q: "Quand la PMT est-elle obligatoire ?",
    a: "La prescription est obligatoire pour toute demande de prise en charge, quel que soit le taux de remboursement. Elle l'est également pour les transports en série (par exemple plusieurs séances de dialyse ou de chimiothérapie par semaine).",
  },
  {
    q: "Quelle est sa durée de validité ?",
    a: "Pour un transport ponctuel, la PMT doit être utilisée dans un délai raisonnable après son émission. Pour des transports en série liés à un traitement prolongé, le médecin peut établir une prescription couvrant l'ensemble du cycle de soins.",
  },
  {
    q: "Comment la joindre à votre réservation ?",
    a: "Lors de la réservation sur Docteur Taxi, déclarez votre prescription dans le formulaire et joignez une photo ou un scan du document. Le jour du transport, gardez l'original avec vous : le chauffeur en a besoin pour facturer l'Assurance Maladie en Tiers-Payant.",
  },
  {
    q: "Je n'ai pas encore de PMT, puis-je réserver ?",
    a: "Oui, vous pouvez réserver sans PMT, mais le transport sera alors à votre charge jusqu'à ce que vous puissiez fournir le document, ou remboursé a posteriori selon les modalités de votre caisse d'assurance maladie.",
  },
];

function PmtPrescriptionArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="pmt-prescription"
      title="Prescription médicale de transport (PMT) : mode d'emploi"
      readingTime="4 min"
      publishedAt="28 mars 2026"
    >
      <FaqSchema items={faqItems} />
      <h2>Qu'est-ce qu'une PMT ?</h2>
      <p>
        La Prescription Médicale de Transport (PMT) est un document établi
        par un médecin attestant que votre état de santé justifie le recours
        à un transport sanitaire (taxi conventionné, VSL ou ambulance) pour
        vous rendre à vos soins. Elle est indispensable pour bénéficier
        d'une prise en charge par l'Assurance Maladie.
      </p>

      <h2>Qui peut délivrer une PMT ?</h2>
      <p>
        Seul un médecin peut établir une PMT : médecin traitant, médecin
        hospitalier ou médecin spécialiste suivant votre pathologie. La
        prescription doit être faite avant le transport, sauf cas
        d'urgence.
      </p>

      <h2>Quand la PMT est-elle obligatoire ?</h2>
      <p>
        La prescription est obligatoire pour toute demande de prise en
        charge, quel que soit le taux de remboursement. Elle l'est
        également pour les transports en série (par exemple plusieurs
        séances de dialyse ou de chimiothérapie par semaine).
      </p>

      <h2>Quelle est sa durée de validité ?</h2>
      <p>
        Pour un transport ponctuel, la PMT doit être utilisée dans un délai
        raisonnable après son émission. Pour des transports en série liés à
        un traitement prolongé, le médecin peut établir une prescription
        couvrant l'ensemble du cycle de soins.
      </p>

      <h2>Comment la joindre à votre réservation ?</h2>
      <p>
        Lors de la réservation sur Docteur Taxi, déclarez votre
        prescription dans le formulaire et joignez une photo ou un scan du
        document. Le jour du transport, gardez l'original avec vous : le
        chauffeur en a besoin pour facturer l'Assurance Maladie en
        Tiers-Payant.
      </p>

      <h2>Je n'ai pas encore de PMT, puis-je réserver ?</h2>
      <p>
        Oui, vous pouvez réserver sans PMT, mais le transport sera alors à
        votre charge jusqu'à ce que vous puissiez fournir le document, ou
        remboursé a posteriori selon les modalités de votre caisse
        d'assurance maladie. Le détail de cette situation est expliqué dans
        notre guide{" "}
        <Link to="/blog/taxi-sans-prescription">
          Taxi conventionné sans prescription médicale : est-ce possible ?
        </Link>
        .
      </p>
      <p>
        Pour mieux comprendre les taux de remboursement applicables,
        consultez notre guide{" "}
        <Link to="/blog/transport-cpam">
          Transport pris en charge Assurance Maladie : tout savoir
        </Link>
        .
      </p>
    </BlogLayout>
  );
}
