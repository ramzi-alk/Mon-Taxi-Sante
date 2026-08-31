import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute(
  "/blog/reserver-taxi-conventionne-prescription-medicale",
)({
  head: () => ({
    meta: [
      { title: "Réserver un Taxi Conventionné avec une PMT — Docteur Taxi" },
      {
        name: "description",
        content:
          "Comment réserver un taxi conventionné avec votre prescription médicale de transport ? Les points à vérifier pour un trajet sans avance de frais.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://docteurtaxi.fr/blog/reserver-taxi-conventionne-prescription-medicale",
      },
    ],
  }),
  component: ReserverTaxiConventionnePrescriptionMedicaleArticle,
});

const faqItems = [
  {
    q: "Faut-il envoyer la PMT à la Sécurité sociale avant de réserver le taxi ?",
    a: "Dans la majorité des cas, non : vous conservez l'original et le remettez au chauffeur le jour de la course. Exception : un trajet nécessitant un accord préalable (plus de 150 km ou transports itératifs) doit être envoyé à la CPAM au moins 15 jours avant.",
  },
  {
    q: "Le médecin peut-il me faire l'ordonnance après le rendez-vous médical ?",
    a: "Non. La prescription doit impérativement être établie avant la réalisation du transport. Aucune prescription rétroactive n'est acceptée, ce qui obligerait à payer la course intégralement.",
  },
  {
    q: "Puis-je utiliser un VTC ou un taxi classique avec ma prescription ?",
    a: "Non. Pour que votre PMT ouvre droit au Tiers-Payant, vous devez voyager à bord d'un véhicule agréé par l'Assurance Maladie : un taxi conventionné (logo bleu) ou un VSL.",
  },
  {
    q: "Ma prescription médicale de transport a-t-elle une date de péremption ?",
    a: "Pour un transport ponctuel, elle est rattachée à la date de votre rendez-vous. Si celui-ci est décalé de quelques jours par l'hôpital, l'ordonnance reste généralement valable tant que le motif médical est strictement identique.",
  },
];

function ReserverTaxiConventionnePrescriptionMedicaleArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="reserver-taxi-conventionne-prescription-medicale"
      title="Réserver un taxi avec une prescription médicale de transport"
      readingTime="4 min"
      publishedAt="9 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Vous venez de recevoir une ordonnance de votre médecin vous
        autorisant à utiliser un transport sanitaire pour votre prochain
        rendez-vous. Comment passer de ce document papier à la réservation
        concrète de votre trajet ? Que faut-il vérifier avant de contacter un
        chauffeur pour garantir le Tiers-Payant ?
      </p>

      <p>
        Pour savoir si votre situation ouvre droit à une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        et selon quel taux, consultez notre guide{" "}
        <Link to="/blog/transport-cpam">
          Transport pris en charge Assurance Maladie
        </Link>
        . Une fois la prescription en main, voici les vérifications et
        étapes concrètes de la réservation.
      </p>

      <h2>Les 3 points à vérifier sur votre PMT avant de réserver</h2>
      <p>
        Pour que votre réservation se déroule parfaitement et que le
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

      <h2>Quels documents préparer pour le chauffeur ?</h2>
      <p>
        Le jour du rendez-vous, préparez l'original de votre PMT (les
        photocopies sont refusées), votre carte Vitale à jour et, si votre
        prise en charge est à 65 %, votre attestation de mutuelle. Le détail
        de ces conditions et ce qui se passe si un document manque sont
        expliqués dans notre guide{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Taxi conventionné : zéro avance de frais
        </Link>
        .
      </p>

      <h2>Comment réserver concrètement sur Docteur Taxi ?</h2>
      <p>
        Une fois votre prescription vérifiée, la réservation ne prend que
        quelques instants sur notre page de{" "}
        <Link to="/reservation">réservation en ligne</Link>. Pour garantir la
        disponibilité du véhicule, effectuez votre demande 48 à 72 heures à
        l'avance. Il vous sera simplement demandé l'adresse de prise en
        charge et de destination, l'heure de votre rendez-vous, et la
        confirmation que vous possédez une PMT valide.
      </p>
      <p>
        Si votre prescription concerne des séries de soins sur plusieurs
        semaines, vous pouvez grouper vos réservations en une seule fois —
        voir notre guide sur l'organisation des{" "}
        <Link to="/blog/traitements-reguliers-taxi-conventionne">
          traitements réguliers
        </Link>{" "}
        (chimiothérapie, radiothérapie, dialyse).
      </p>
    </BlogLayout>
  );
}
