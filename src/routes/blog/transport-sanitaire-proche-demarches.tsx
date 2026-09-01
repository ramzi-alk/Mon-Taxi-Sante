import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute(
  "/blog/transport-sanitaire-proche-demarches",
)({
  head: () => ({
    meta: [
      { title: "Transport Sanitaire d'un Proche : Démarches — Docteur Taxi" },
      {
        name: "description",
        content:
          "Aidant familial ? Les démarches pour organiser le transport sanitaire d'un proche malade en taxi conventionné, avec Tiers-Payant intégral.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/transport-sanitaire-proche-demarches"),
  }),
  component: TransportSanitaireProcheDemarchesArticle,
});

const faqItems = [
  {
    q: "Puis-je réserver un taxi conventionné au nom et à la place de mon parent ?",
    a: "Oui. Vous pouvez effectuer la réservation en ligne ou par téléphone pour un membre de votre famille : il suffit de renseigner l'identité du patient, les adresses de prise en charge et de destination, et de confirmer qu'il possède une prescription médicale.",
  },
  {
    q: "Mon père vit en EHPAD, peut-on commander un taxi conventionné pour ses rendez-vous ?",
    a: "Oui. Si votre proche réside en EHPAD et doit se rendre à une consultation extérieure, un taxi conventionné peut être prescrit. Le chauffeur le prend en charge à l'accueil de l'établissement.",
  },
  {
    q: "Dois-je être présent au départ du taxi si je ne monte pas avec mon proche ?",
    a: "Ce n'est pas obligatoire, mais fortement recommandé pour un patient âgé ou désorienté : un proche ou un membre du personnel soignant peut s'assurer qu'il a bien sa carte Vitale et sa PMT avant de monter dans le véhicule.",
  },
  {
    q: "Comment annuler le transport si l'état de santé de mon proche s'aggrave le matin même ?",
    a: "Contactez la plateforme ou le chauffeur le plus tôt possible pour annuler la course. Aucun frais d'annulation n'est facturé au patient.",
  },
];

function TransportSanitaireProcheDemarchesArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="transport-sanitaire-proche-demarches"
      title="Transport sanitaire d'un proche : démarches et conseils"
      readingTime="6 min"
      publishedAt="8 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        En France, des millions d'aidants familiaux accompagnent au quotidien
        un parent vieillissant, un conjoint malade ou un enfant en situation
        de handicap. Parmi les charges de ce rôle : la gestion des
        rendez-vous médicaux et des trajets. Comment organiser le transport
        sanitaire d'un proche sans se tromper dans les démarches, et lui
        éviter d'avancer les frais ? Voici comment planifier ces trajets en
        taxi conventionné en toute tranquillité.
      </p>

      <h2>Le rôle de l'aidant dans la réservation</h2>
      <p>
        Lorsqu'un patient souffre de troubles cognitifs, d'une grande fatigue
        liée à une maladie chronique, ou qu'il n'est pas à l'aise avec les
        outils numériques ou téléphoniques, c'est souvent son aidant qui
        prend le relais. L'Assurance Maladie et les réseaux de taxis
        conventionnés autorisent parfaitement un tiers (enfant, conjoint,
        tuteur légal, infirmier à domicile) à organiser les trajets : lors
        de la réservation, vous agissez comme « donneur d'ordre ». Il est
        simplement essentiel d'effectuer la démarche au nom du patient, avec
        ses documents à lui.
      </p>

      <h2>Vérifier la prescription médicale de transport avant de réserver</h2>
      <p>
        Avant de réserver le moindre véhicule, assurez-vous que votre proche
        dispose d'une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        en cours de validité, rédigée par le médecin avant le trajet. En tant
        qu'aidant, vérifiez que le nom inscrit sur la PMT est bien celui de
        votre proche, que la case « Transport assis professionnalisé » est
        cochée, et — si sa présence rassurante est nécessaire — que la case
        « Accompagnant » l'est également.
      </p>

      <h2>L'aidant peut-il voyager avec son proche dans le taxi ?</h2>
      <p>
        Si cette présence est justifiée médicalement et cochée sur
        l'ordonnance, vous pouvez voyager avec votre proche sans supplément,
        Tiers-Payant compris. Le détail des règles applicables (cas
        justifiés, ce qui se passe sans la case cochée) est expliqué dans
        notre guide{" "}
        <Link to="/blog/accompagnant-taxi-conventionne">
          Accompagnant en taxi conventionné
        </Link>
        .
      </p>

      <h2>Éviter à votre proche l'avance des frais</h2>
      <p>
        Gérer le budget d'un parent en perte d'autonomie est complexe. Si les
        soins de votre proche relèvent d'une{" "}
        <Link to="/blog/ald-transport">
          Affection de Longue Durée
        </Link>
        , le transport est pris en charge à 100 % ; sinon, au régime
        standard à 65 %, complété par sa mutuelle. Dans les deux cas, le{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Tiers-Payant
        </Link>{" "}
        évite à votre proche de sortir son portefeuille : le chauffeur
        télétransmet directement la facture à l'Assurance Maladie.
      </p>

      <h2>La check-list de l'aidant : documents à confier le jour J</h2>
      <p>
        Si vous ne montez pas dans le véhicule avec votre proche, préparez
        une pochette contenant les documents exigés par le chauffeur pour
        valider le Tiers-Payant :
      </p>
      <ol>
        <li>sa carte Vitale à jour (ou son attestation de droits) ;</li>
        <li>son attestation de mutuelle de l'année en cours ;</li>
        <li>l'original de sa Prescription Médicale de Transport signée.</li>
      </ol>
      <p>
        Glissez ces documents dans une pochette bien visible que votre proche
        pourra simplement tendre au chauffeur.
      </p>

      <h2>Réserver sur Docteur Taxi pour un tiers</h2>
      <p>
        Pour planifier le trajet de votre parent ou conjoint, rendez-vous sur
        notre page de{" "}
        <Link to="/reservation">réservation en ligne</Link>, saisissez
        l'adresse de son domicile et celle du centre de soins, indiquez les
        horaires de rendez-vous, et précisez qu'il s'agit d'une réservation
        pour un tiers — vous pouvez laisser votre numéro de téléphone pour
        être prévenu de la bonne prise en charge. Nos chauffeurs
        conventionnés, habitués à accompagner des personnes vulnérables,
        savent faire preuve de patience et de bienveillance.
      </p>
    </BlogLayout>
  );
}
