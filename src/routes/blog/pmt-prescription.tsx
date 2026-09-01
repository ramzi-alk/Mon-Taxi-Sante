import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

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
    links: canonicalLinks("https://docteurtaxi.fr/blog/pmt-prescription"),
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
      readingTime="5 min"
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

      <h2>Les 3 points à vérifier avant de réserver</h2>
      <p>
        Pour que votre réservation se déroule sans accroc et que le
        Tiers-Payant soit appliqué, l'ordonnance doit être complétée sans
        erreur par le médecin. Prenez deux minutes pour vérifier :
      </p>
      <ul>
        <li>
          <strong>Le mode de transport prescrit</strong> : la case «
          Transport assis professionnalisé » (qui inclut le taxi
          conventionné) doit être cochée. Si le médecin a coché « Ambulance »
          ou « Transports en commun », le chauffeur de taxi ne pourra pas
          facturer la course à la Sécurité sociale.
        </li>
        <li>
          <strong>La date de la prescription</strong> : elle doit toujours
          être antérieure ou égale à la date de votre premier trajet.
        </li>
        <li>
          <strong>La case « Accompagnant »</strong>, si votre état de santé
          nécessite la présence d'un proche pendant le trajet — voir notre
          guide{" "}
          <Link to="/blog/accompagnant-taxi-conventionne">
            Accompagnant en taxi conventionné
          </Link>{" "}
          pour le détail des règles applicables.
        </li>
      </ul>

      <h2>Comment la joindre à votre réservation ?</h2>
      <p>
        Lors de la réservation sur Docteur Taxi, déclarez votre
        prescription dans le formulaire et joignez une photo ou un scan du
        document. Le jour du transport, gardez l'original avec vous : le
        chauffeur en a besoin pour facturer l'Assurance Maladie en
        Tiers-Payant. Pour un trajet ponctuel, comptez 48 à 72 heures
        d'avance pour garantir la disponibilité du véhicule ; pour des
        séries de soins sur plusieurs semaines, vous pouvez grouper vos
        réservations en une seule fois — voir notre guide sur les{" "}
        <Link to="/blog/traitements-reguliers-taxi-conventionne">
          traitements réguliers
        </Link>{" "}
        (chimiothérapie, radiothérapie, dialyse).
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
