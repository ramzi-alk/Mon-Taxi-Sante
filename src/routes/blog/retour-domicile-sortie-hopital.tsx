import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/retour-domicile-sortie-hopital")({
  head: () => ({
    meta: [
      { title: "Sortie d'Hôpital : Retour en Taxi Conventionné — Docteur Taxi" },
      {
        name: "description",
        content:
          "Comment organiser votre retour à domicile après une hospitalisation en taxi conventionné ? Bon de transport, règles CPAM et zéro avance de frais.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://docteurtaxi.fr/blog/retour-domicile-sortie-hopital" },
    ],
  }),
  component: RetourDomicileSortieHopitalArticle,
});

const faqItems = [
  {
    q: "Mon médecin traitant peut-il faire l'ordonnance pour ma sortie d'hôpital ?",
    a: "En principe, non. La Prescription Médicale de Transport liée à une hospitalisation doit être rédigée par le médecin du service hospitalier dans lequel vous avez séjourné, seul à même d'évaluer votre état de santé au moment de la sortie.",
  },
  {
    q: "Puis-je utiliser le bon de transport de mon trajet aller pour rentrer chez moi ?",
    a: "Non, un bon de transport est spécifique à un trajet. Si vous avez été hospitalisé, il vous faut une nouvelle ordonnance stipulant expressément le trajet de retour à domicile ou le transfert vers un centre de rééducation.",
  },
  {
    q: "L'hôpital ne m'a pas donné d'heure de sortie exacte, comment réserver le taxi ?",
    a: "C'est une situation fréquente. Réservez votre taxi conventionné avec une heure estimée, en précisant qu'il s'agit d'une sortie d'hospitalisation : les chauffeurs habitués à ce contexte s'adaptent aux légers aléas d'horaire.",
  },
  {
    q: "Dois-je payer mon retour en taxi si mon hospitalisation a été courte ?",
    a: "Si un médecin vous a prescrit un transport assis professionnalisé, celui-ci est pris en charge par l'Assurance Maladie, à 65 % ou à 100 % selon votre situation. Avec le Tiers-Payant, vous n'avez pas à avancer les frais.",
  },
];

function RetourDomicileSortieHopitalArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="retour-domicile-sortie-hopital"
      title="Sortie d'hôpital : votre retour en taxi conventionné"
      readingTime="5 min"
      publishedAt="4 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Quitter l'hôpital après une intervention, des examens ou un séjour
        plus long est un soulagement, mais organiser le retour à domicile
        peut vite devenir un casse-tête. La fatigue, les bagages et
        l'appréhension du trajet rendent souvent impossible l'usage des
        transports en commun ou de son propre véhicule. Voici comment
        solliciter un taxi conventionné pour ce retour, qui doit rédiger le
        bon de transport, et comment éviter d'avancer les frais.
      </p>

      <h2>Un retour médicalisé soumis à condition de santé</h2>
      <p>
        La sortie de l'hôpital ou de la clinique fait partie intégrante du
        parcours de soins, mais la prise en charge d'un trajet en transport
        sanitaire n'est pas automatique : elle dépend de votre état de santé
        le jour du départ. Déficience physique temporaire, intervention sous
        anesthésie récente, ou contraintes de posture précises sans nécessité
        d'être allongé — dans ces cas, le médecin peut considérer qu'un
        transport assis professionnalisé (taxi conventionné ou VSL) est
        médicalement justifié.
      </p>

      <h2>Qui doit rédiger la prescription de transport ?</h2>
      <p>
        Pas de remboursement sans{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>
        . Dans le cadre d'une sortie d'hospitalisation, c'est le médecin du
        service hospitalier ou le chirurgien qui doit rédiger ce document —
        demandez-le à l'équipe médicale la veille ou le matin de votre
        sortie. Votre médecin traitant ne peut pas établir cette prescription
        rétroactivement une fois rentré chez vous : l'Assurance Maladie la
        refuserait, et les frais resteraient à votre charge.
      </p>

      <h2>Quelle prise en charge par l'Assurance Maladie ?</h2>
      <p>
        Le taux de remboursement de votre trajet de retour dépend de votre
        situation médicale et administrative :
      </p>
      <ul>
        <li>
          <strong>100 %</strong> si l'hospitalisation est en lien direct avec
          une{" "}
          <Link to="/blog/ald-transport">
            Affection de Longue Durée
          </Link>
          , si vous bénéficiez de la Complémentaire Santé Solidaire, ou s'il
          s'agit d'un accident du travail.
        </li>
        <li>
          <strong>65 %</strong> pour les autres situations, le reste pouvant
          être couvert par votre mutuelle.
        </li>
      </ul>
      <p>
        En réservant sur Docteur Taxi, vous bénéficiez du Tiers-Payant : en
        fournissant votre carte Vitale, votre attestation de mutuelle et
        votre PMT, vous n'avez pas à avancer les frais au chauffeur.
      </p>

      <h2>Comment anticiper et réserver votre taxi le jour J ?</h2>
      <p>
        L'heure exacte de sortie est souvent incertaine : elle dépend de la
        dernière visite du médecin, de l'édition des documents de sortie ou
        du retrait d'une perfusion. Pour un retour serein :
      </p>
      <ol>
        <li>
          la veille de votre départ, demandez confirmation à l'équipe
          soignante que vous aurez bien droit à un bon de transport en
          position assise ;
        </li>
        <li>
          réservez votre course en indiquant le nom de l'hôpital, le service
          et une heure estimée ;
        </li>
        <li>
          précisez qu'il s'agit d'une sortie d'hospitalisation, un contexte
          que nos chauffeurs conventionnés connaissent bien et pour lequel ils
          s'adaptent aux légers retards administratifs.
        </li>
      </ol>

      <h2>Transfert vers un centre de rééducation (SSR)</h2>
      <p>
        Dans certains cas, la sortie de l'hôpital ne signifie pas un retour à
        domicile immédiat : si vous êtes transféré vers un centre de Soins de
        Suite et de Réadaptation ou une maison de convalescence, ce trajet
        relève du même principe de prise en charge. L'hôpital de départ vous
        fournit la PMT pour le transfert, et le chauffeur vous confie à
        l'équipe d'accueil de votre nouvel établissement, toujours sans
        avance de frais.
      </p>
    </BlogLayout>
  );
}
