import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute(
  "/blog/traitements-reguliers-taxi-conventionne",
)({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné : Chimio, Radiothérapie, Dialyse — Docteur Taxi" },
      {
        name: "description",
        content:
          "Chimiothérapie, radiothérapie, dialyse : organisez vos transports réguliers en taxi conventionné, prise en charge à 100 % et zéro avance de frais.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/traitements-reguliers-taxi-conventionne"),
  }),
  component: TraitementsReguliersTaxiConventionneArticle,
});

const faqItems = [
  {
    q: "Une seule ordonnance suffit-elle pour l'ensemble de mes séances ?",
    a: "Oui. Votre médecin peut établir une Prescription Médicale de Transport globale indiquant la durée totale du protocole et le rythme des séances (par exemple 30 séances de radiothérapie sur 6 semaines), sans avoir à en refaire une à chaque trajet.",
  },
  {
    q: "Qu'est-ce que la règle des transports itératifs pour l'accord préalable ?",
    a: "La CPAM définit les transports itératifs comme au moins 4 trajets de plus de 50 km aller, sur une période de 2 mois, pour un même protocole de soins. Dans ce cas, une demande d'accord préalable auprès du médecin-conseil est requise avant le premier départ.",
  },
  {
    q: "Puis-je avoir le même chauffeur pour tous mes rendez-vous ?",
    a: "Dans la mesure du possible et selon les plannings, la régularité est privilégiée pour vous assurer un suivi confortable avec un conducteur qui connaît vos habitudes et vos horaires.",
  },
  {
    q: "Dois-je payer si ma séance est annulée ou reportée au dernier moment ?",
    a: "Non. Si votre séance est annulée par le centre de soins ou pour raison médicale avant votre prise en charge, aucun frais ne vous est facturé. Prévenez simplement le plus tôt possible.",
  },
];

function TraitementsReguliersTaxiConventionneArticle() {
  return (
    <BlogLayout
      category="ALD"
      slug="traitements-reguliers-taxi-conventionne"
      title="Taxi conventionné et soins réguliers : chimio, radiothérapie, dialyse"
      readingTime="6 min"
      publishedAt="2 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Suivre un traitement lourd tel qu'une chimiothérapie, une
        radiothérapie ou des séances de dialyse demande une énergie
        considérable. Entre la fatigue accumulée, les effets secondaires et le
        rythme soutenu des rendez-vous, conduire son propre véhicule devient
        souvent impossible. L'Assurance Maladie prévoit une prise en charge
        intégrale de ces trajets en taxi conventionné ou VSL. Voici comment
        organiser vos transports réguliers, avec le Tiers-Payant sans avance
        de frais.
      </p>

      <h2>Pourquoi privilégier le transport sanitaire assis pour ces soins ?</h2>
      <p>
        Les protocoles de soins en oncologie ou en néphrologie imposent un
        rythme soutenu : plusieurs séances hebdomadaires de dialyse, séances
        quotidiennes de radiothérapie pendant plusieurs semaines, ou
        perfusions de chimiothérapie en hôpital de jour. Après de telles
        séances, la baisse de vigilance, les nausées ou la faiblesse
        musculaire rendent la conduite dangereuse.
      </p>
      <p>Faire appel à un taxi conventionné ou à un VSL permet notamment de :</p>
      <ul>
        <li>
          <strong>Préserver votre énergie</strong> : vous êtes pris en charge
          au pas de votre porte et déposé directement à l'accueil de votre
          service de soins.
        </li>
        <li>
          <strong>Respecter des créneaux stricts</strong> : les disponibilités
          des machines (accélérateurs de particules, générateurs de dialyse)
          laissent peu de marge, et un chauffeur professionnel garantit votre
          arrivée à l'heure.
        </li>
        <li>
          <strong>Voyager avec un proche si besoin</strong> : un{" "}
          <Link to="/blog/accompagnant-taxi-conventionne">
            accompagnant peut monter avec vous en taxi conventionné
          </Link>{" "}
          sans surcoût, sous réserve des règles médicales.
        </li>
      </ul>

      <h2>Quelle prise en charge pour ces traitements ?</h2>
      <p>
        Le cancer et l'insuffisance rénale chronique figurent parmi les 30{" "}
        <Link to="/blog/ald-transport">
          Affections de Longue Durée exonérantes
        </Link>{" "}
        reconnues par l'Assurance Maladie. Dès lors que vos déplacements sont
        directement liés au traitement de votre ALD et prescrits par votre
        médecin, ils sont pris en charge à 100 % par la Sécurité sociale. Avec
        le Tiers-Payant intégral, vous n'avez aucun frais à avancer, à l'aller
        comme au retour.
      </p>

      <h2>Une prescription médicale de transport globale</h2>
      <p>
        Votre oncologue, néphrologue ou médecin traitant n'a pas besoin de
        rédiger une ordonnance pour chaque séance. Il peut établir une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        pour l'ensemble de la série de soins, en précisant le nombre de
        séances ou la période couverte, le mode de transport adapté et le
        motif médical.
      </p>

      <h2>L'accord préalable pour les transports itératifs</h2>
      <p>
        Une règle spécifique s'applique lorsque les trajets sont à la fois
        fréquents et éloignés. Si votre traitement nécessite au moins 4
        transports de plus de 50 km aller sur une période de 2 mois pour un
        même protocole, votre médecin doit remplir un formulaire de demande
        d'accord préalable, envoyé au service médical de votre CPAM avant le
        début des transports. Sans réponse négative sous 15 jours, l'accord
        est considéré comme tacitement validé.
      </p>

      <h2>Organiser vos séries de trajets avec Docteur Taxi</h2>
      <p>
        Gérer manuellement une quinzaine, voire une trentaine de réservations
        peut devenir une charge mentale importante pour les patients et leurs
        aidants. Vous pouvez planifier l'ensemble de votre calendrier de
        traitement en une seule fois en nous communiquant vos dates et heures
        de rendez-vous. En cas d'aléa — séance qui dure plus longtemps que
        prévu, consultation décalée — la prise en charge du trajet retour
        s'ajuste en conséquence.
      </p>

      <h2>Quels documents avoir avec soi à chaque trajet ?</h2>
      <p>
        Pour une prise en charge fluide et sans avance de frais, munissez-vous
        de :
      </p>
      <ol>
        <li>
          votre carte Vitale à jour (ou votre attestation de droits mentionnant
          l'ouverture de l'ALD) ;
        </li>
        <li>
          l'original ou le double de votre Prescription Médicale de Transport
          signée ;
        </li>
        <li>
          la copie de l'accord préalable de la CPAM si votre situation
          kilométrique l'exigeait.
        </li>
      </ol>
      <p>
        Le chauffeur télétransmet directement ces documents à l'Assurance
        Maladie : vous n'avez aucune feuille de soins à renvoyer par courrier.
      </p>
    </BlogLayout>
  );
}
