import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute("/blog/transport-pmr-personnes-agees")({
  head: () => ({
    meta: [
      { title: "Taxi PMR : Transport Médical Fauteuil Roulant — Docteur Taxi" },
      {
        name: "description",
        content:
          "Taxi PMR pour personnes à mobilité réduite ou en fauteuil roulant : véhicule adapté, prise en charge Assurance Maladie et comment réserver.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/transport-pmr-personnes-agees"),
  }),
  component: TransportPmrArticle,
});

const faqItems = [
  {
    q: "Qu'est-ce qu'un Taxi PMR ?",
    a: "Un Taxi PMR est un taxi conventionné aménagé d'une rampe d'accès et d'un système de fixation homologué pour accueillir un fauteuil roulant, manuel ou électrique, en toute sécurité.",
  },
  {
    q: "Qui peut réserver un Taxi PMR ?",
    a: "Toute personne à mobilité réduite : personne en fauteuil roulant, personne âgée avec des difficultés à se déplacer, ou personne en situation de handicap moteur. Une Prescription Médicale de Transport est nécessaire pour bénéficier d'une prise en charge par l'Assurance Maladie.",
  },
  {
    q: "Le Taxi PMR est-il remboursé comme un taxi conventionné classique ?",
    a: "Oui, les mêmes règles de prise en charge s'appliquent (100 % en ALD, maternité ou CMU-C/CSS, 65 % pour un assuré standard), avec en plus un supplément de 30,00 € pour l'aide particulière apportée (fauteuil roulant, accompagnement spécifique).",
  },
  {
    q: "Le Taxi PMR peut-il transporter un brancard ?",
    a: "Non. Ni le taxi ni le VSL, y compris le Taxi PMR, ne sont adaptés au transport allongé sur brancard. Si votre état de santé nécessite d'être transporté allongé, seule une ambulance convient.",
  },
  {
    q: "Comment réserver un Taxi PMR ?",
    a: "Lors de votre réservation en ligne, sélectionnez le véhicule Taxi PMR et précisez si le fauteuil est manuel ou électrique. Le chauffeur arrive avec un véhicule équipé de la rampe d'accès adaptée.",
  },
];

function TransportPmrArticle() {
  return (
    <BlogLayout
      category="Accessibilité"
      slug="transport-pmr-personnes-agees"
      title="Taxi PMR : transport médical pour fauteuil roulant"
      readingTime="3 min"
      publishedAt="21 juillet 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Se déplacer en fauteuil roulant ou avec une mobilité réduite ne doit
        pas compliquer l'accès aux soins. Le Taxi PMR (Personne à Mobilité
        Réduite) est une solution de transport conventionné pensée pour ces
        besoins, remboursable dans les mêmes conditions qu'un taxi classique.
      </p>

      <h2>Qu'est-ce qu'un Taxi PMR ?</h2>
      <p>
        Un Taxi PMR est un taxi conventionné équipé d'une rampe d'accès
        électrique et d'un système de fixation homologué, permettant
        d'accueillir un fauteuil roulant manuel ou électrique en toute
        sécurité pendant le trajet.
      </p>

      <h2>Qui peut en bénéficier ?</h2>
      <p>
        Le Taxi PMR s'adresse à toute personne à mobilité réduite : personne
        en fauteuil roulant, personne âgée ayant des difficultés à se
        déplacer, ou personne en situation de handicap moteur. Comme pour
        tout transport conventionné, une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        est nécessaire pour bénéficier d'une prise en charge par l'Assurance
        Maladie.
      </p>

      <h2>Quelle est la prise en charge Assurance Maladie ?</h2>
      <p>
        Les mêmes taux de remboursement qu'un taxi conventionné classique
        s'appliquent : 100 % en ALD, maternité ou CMU-C/CSS avec Tiers-Payant
        intégral, 65 % pour un assuré standard. S'y ajoute un supplément de
        30,00 € pour l'aide particulière apportée (fauteuil roulant,
        accompagnement spécifique), détaillé dans notre page{" "}
        <Link to="/tarifs-cpam">tarifs de la convention nationale 2025</Link>.
      </p>

      <h2>Le Taxi PMR permet-il un transport allongé ?</h2>
      <p>
        Non. Ni le taxi ni le VSL, y compris le Taxi PMR, ne sont adaptés au
        transport allongé sur brancard. Si votre état de santé nécessite
        d'être transporté allongé ou sous surveillance médicale, seule une
        ambulance convient — voir notre comparatif{" "}
        <Link to="/blog/vsl-ou-taxi-conventionne">
          Taxi conventionné, VSL ou ambulance : quelle différence ?
        </Link>
        .
      </p>

      <p>
        Pour le détail de ce que vous pouvez emporter (bagages,
        déambulateur) et la différence avec un fauteuil manuel transporté
        dans un taxi classique, voir notre guide{" "}
        <Link to="/blog/bagages-materiel-taxi-conventionne">
          Bagages et matériel en taxi conventionné
        </Link>
        .
      </p>

      <h2>Comment réserver un Taxi PMR ?</h2>
      <p>
        Lors de votre réservation en ligne, sélectionnez le véhicule « Taxi
        PMR » et précisez si le fauteuil est manuel ou électrique : le
        chauffeur arrive avec un véhicule équipé de la rampe d'accès adaptée,
        sans surcoût à avancer si votre prise en charge est à 100 %.
      </p>
    </BlogLayout>
  );
}
