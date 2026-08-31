import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/accompagnant-taxi-conventionne")({
  head: () => ({
    meta: [
      { title: "Accompagnant en Taxi Conventionné : Règles CPAM — Docteur Taxi" },
      {
        name: "description",
        content:
          "Un proche peut-il vous accompagner en taxi conventionné ou VSL ? Les règles de prise en charge par la CPAM et comment réserver sans avance de frais.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://docteurtaxi.fr/blog/accompagnant-taxi-conventionne" },
    ],
  }),
  component: AccompagnantTaxiConventionneArticle,
});

const faqItems = [
  {
    q: "Mon proche peut-il m'accompagner dans le taxi conventionné ?",
    a: "Oui. Si votre état de santé nécessite une assistance (ou si le patient a moins de 16 ans) et que le médecin a coché la case « Accompagnant » sur la Prescription Médicale de Transport, sa présence est formellement justifiée et couverte.",
  },
  {
    q: "L'accompagnant doit-il payer sa place dans le taxi ?",
    a: "Non. En taxi conventionné, la facturation se fait au trajet, quel que soit le nombre de passagers. L'accompagnant n'a donc aucun supplément à payer, et le Tiers-Payant intégral s'applique si vous y êtes éligible.",
  },
  {
    q: "Peut-on être plusieurs accompagnants dans un taxi ou un VSL ?",
    a: "L'Assurance Maladie ne prend en charge qu'un seul accompagnant. La présence d'une autre personne dépendra ensuite de la capacité du véhicule et de l'accord du chauffeur, mais elle n'est pas garantie par la prise en charge.",
  },
  {
    q: "Que se passe-t-il si la case « Accompagnant » n'est pas cochée sur l'ordonnance ?",
    a: "En pratique, de nombreux chauffeurs de taxi conventionné acceptent malgré tout un proche. C'est plus incertain en VSL, où le véhicule peut être partagé avec d'autres patients. Il est donc recommandé de faire cocher cette case par votre médecin dès la prescription.",
  },
];

function AccompagnantTaxiConventionneArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="accompagnant-taxi-conventionne"
      title="Accompagnant en taxi conventionné : règles et prise en charge"
      readingTime="5 min"
      publishedAt="1er septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Se rendre à un rendez-vous médical, une séance de dialyse ou une
        hospitalisation est souvent une source d'inquiétude. La présence d'un
        conjoint, d'un parent ou d'un aidant est alors précieuse, voire
        indispensable. Un proche a-t-il le droit de monter avec vous dans un
        taxi conventionné ou un VSL ? Doit-il payer sa place ? Voici les
        règles de l'Assurance Maladie et comment organiser votre trajet.
      </p>

      <h2>Dans quels cas la présence d'un accompagnant est-elle justifiée ?</h2>
      <p>
        Pour que la présence d'un proche soit reconnue par l'Assurance
        Maladie, votre situation doit correspondre à l'un de ces deux cas :
      </p>
      <ul>
        <li>
          <strong>Le patient est mineur</strong> : tout patient de moins de
          16 ans doit être accompagné par un parent ou un tuteur légal lors de
          son transport sanitaire.
        </li>
        <li>
          <strong>L'état de santé du patient l'exige</strong> : personne à
          mobilité réduite, personne âgée en perte d'autonomie, ou pathologie
          nécessitant l'assistance d'un tiers pendant le trajet (risque de
          malaise, troubles de l'orientation).
        </li>
      </ul>
      <p>
        Dans ces situations, le médecin prescripteur doit correctement
        remplir la{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>
        .
      </p>

      <h2>Comment justifier l'accompagnant sur la prescription médicale ?</h2>
      <p>
        Au moment de rédiger l'ordonnance de transport, votre médecin évalue
        le mode de transport le plus adapté à votre état de santé. S'il
        estime que vous avez besoin d'aide, il doit cocher la case «
        Accompagnant » de la prescription. C'est cette mention qui donne
        officiellement le droit à votre proche de voyager avec vous : pensez
        à aborder ce point en consultation, une ordonnance déjà signée étant
        difficile à faire modifier après coup.
      </p>

      <h2>L'accompagnant doit-il payer un supplément ou avancer des frais ?</h2>
      <p>
        La présence d'un accompagnant justifié ne génère aucun coût
        supplémentaire. En taxi conventionné, la tarification suit la{" "}
        <Link to="/tarifs-cpam">convention nationale taxi</Link>, au trajet et
        non à la place occupée : que vous soyez seul ou accompagné, le coût
        reste le même.
      </p>
      <p>
        Si votre transport est pris en charge à 100 % — par exemple dans le
        cadre d'une{" "}
        <Link to="/blog/ald-transport">Affection de Longue Durée</Link> —, ni
        vous ni votre accompagnant n'avez de frais à avancer : le Tiers-Payant
        s'applique normalement. Seul un accompagnant est en revanche couvert
        par la prise en charge ; la présence d'une autre personne relève de
        l'accord du chauffeur et de la place disponible dans le véhicule.
      </p>

      <h2>Et si la case « Accompagnant » n'est pas cochée ?</h2>
      <p>
        Dans la pratique du taxi conventionné, les chauffeurs sont
        généralement compréhensifs : si l'espace du véhicule le permet, ils
        acceptent souvent la présence d'un proche même sans mention officielle
        sur l'ordonnance.
      </p>
      <p>
        La situation est plus stricte en{" "}
        <Link to="/blog/vsl-ou-taxi-conventionne">VSL</Link>, où le véhicule
        peut être partagé entre plusieurs patients au cours d'une même
        tournée : sans la case cochée, la place pour un accompagnant n'est pas
        garantie. D'où l'intérêt de préciser ce besoin dès la prescription et
        au moment de la réservation.
      </p>

      <h2>Réserver un taxi conventionné avec un accompagnant</h2>
      <p>
        Lors de votre réservation sur Docteur Taxi, indiquez simplement que
        vous serez accompagné : nous nous assurons qu'un véhicule avec
        suffisamment de places est prévu. Le Tiers-Payant intégral s'applique
        dès lors que votre Prescription Médicale de Transport le permet, sans
        avance de frais pour vous ni pour votre proche.
      </p>
    </BlogLayout>
  );
}
