import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute("/blog/taxi-conventionne-grossesse")({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné et Grossesse : Prise en Charge — Docteur Taxi" },
      {
        name: "description",
        content:
          "Les règles de la CPAM pour le taxi conventionné pendant la grossesse : remboursement à 100 % dès le 6ème mois, zéro avance de frais pour vos échographies.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/taxi-conventionne-grossesse"),
  }),
  component: TaxiConventionneGrossesseArticle,
});

const faqItems = [
  {
    q: "Puis-je prendre un taxi conventionné le jour de mon accouchement ?",
    a: "Le taxi conventionné est réservé aux transports assis et non urgents. Si le travail a commencé, que les contractions sont rapprochées ou que vous avez perdu les eaux, appelez le 15 (SAMU) ou faites appel à une ambulance. Le taxi conventionné convient en revanche parfaitement à un déclenchement ou une césarienne programmés.",
  },
  {
    q: "La prise en charge est-elle de 100 % pendant toute la grossesse ?",
    a: "Non. Jusqu'à la fin du 5ème mois de grossesse, le transport sanitaire est pris en charge à 65 % (sauf ALD). À partir du 1er jour du 6ème mois, le régime maternité prend le relais et couvre vos transports médicaux à 100 % jusqu'à 12 jours après l'accouchement.",
  },
  {
    q: "Mon conjoint peut-il monter avec moi dans le taxi conventionné ?",
    a: "Si le médecin estime que votre état nécessite l'assistance d'une tierce personne pendant le trajet, il peut cocher la case « Accompagnant » sur votre prescription. Votre conjoint peut alors voyager avec vous sans frais supplémentaire.",
  },
  {
    q: "Les séances de préparation à l'accouchement ouvrent-elles droit au transport sanitaire ?",
    a: "Oui, si votre médecin ou votre sage-femme vous prescrit un bon de transport en justifiant que votre état physique ne vous permet pas de vous déplacer par vos propres moyens ou en transports en commun pour vous rendre à ces séances.",
  },
];

function TaxiConventionneGrossesseArticle() {
  return (
    <BlogLayout
      category="Prise en charge"
      slug="taxi-conventionne-grossesse"
      title="Taxi conventionné et grossesse : prise en charge et conseils"
      readingTime="5 min"
      publishedAt="3 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        La grossesse est jalonnée de nombreux rendez-vous médicaux :
        consultations de suivi mensuel, échographies trimestrielles, examens
        biologiques ou séances de préparation à la naissance. Au fil des
        mois, la fatigue s'installe et les trajets en voiture ou en
        transports en commun peuvent devenir éprouvants, voire déconseillés
        par votre médecin. Voici comment bénéficier d'une prise en charge par
        la CPAM pour vos déplacements médicaux durant cette période.
      </p>

      <h2>Grossesse et transport médicalisé : dans quels cas est-ce justifié ?</h2>
      <p>
        Être enceinte n'ouvre pas automatiquement droit au transport
        sanitaire pour chaque déplacement : comme pour tout patient, la prise
        en charge repose sur votre état de santé, évalué par votre médecin ou
        votre sage-femme. Le recours à un{" "}
        <Link to="/blog/vsl-ou-taxi-conventionne">taxi conventionné</Link>{" "}
        peut être prescrit en cas de déficience physique ou de fatigue
        intense rendant impossible l'usage de votre véhicule personnel ou des
        transports en commun — c'est notamment le cas lors d'une grossesse
        pathologique, d'une menace d'accouchement prématuré exigeant un repos
        strict, ou de douleurs pelviennes prononcées en fin de grossesse.
      </p>

      <h2>La règle de l'ordonnance : la Prescription Médicale de Transport</h2>
      <p>
        Pour qu'un trajet en taxi soit remboursé, vous devez être en
        possession d'une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        établie par votre praticien avant le transport. Le médecin y indique
        le motif (suivi de grossesse, examens obligatoires) et le mode de
        transport adapté. Sans cette prescription, aucun chauffeur
        conventionné ne peut appliquer le Tiers-Payant, et le trajet reste à
        votre charge.
      </p>

      <h2>Prise en charge CPAM : 65 % ou 100 % selon le terme de la grossesse</h2>
      <p>La couverture de vos transports évolue avec l'avancement de la grossesse :</p>
      <ul>
        <li>
          <strong>Du 1er au 5ème mois inclus</strong> : vos transports
          prescrits sont pris en charge à 65 % par l'Assurance Maladie, le
          reste pouvant être couvert par votre mutuelle. Si votre grossesse
          est liée à une{" "}
          <Link to="/blog/ald-transport">
            Affection de Longue Durée
          </Link>
          , la prise en charge à 100 % s'applique dès le premier jour.
        </li>
        <li>
          <strong>À partir du 1er jour du 6ème mois</strong> : vous basculez
          sous le régime de l'Assurance Maternité. Vos transports sanitaires
          prescrits sont alors pris en charge à 100 %, jusqu'au 12ème jour
          après l'accouchement.
        </li>
      </ul>
      <p>
        Avec le Tiers-Payant intégral, vous n'avez aucune avance de frais à
        faire : le chauffeur facture directement votre caisse d'Assurance
        Maladie et, le cas échéant, votre mutuelle.
      </p>

      <h2>Accouchement le jour J : taxi conventionné ou ambulance ?</h2>
      <p>
        Le taxi conventionné est un transport sanitaire réservé aux trajets
        programmés, non urgents, pour des patients pouvant voyager assis. Si
        vous vous rendez à la maternité pour un rendez-vous de suivi, un
        déclenchement programmé ou une césarienne planifiée, il est
        parfaitement adapté.
      </p>
      <p>
        En revanche, si le travail a commencé, que vous avez perdu les eaux
        ou que les contractions sont intenses, il s'agit d'une urgence
        médicale : ne réservez pas de taxi, composez le 15 (SAMU) ou faites
        appel à une ambulance équipée pour un transport allongé sous
        surveillance.
      </p>

      <h2>Réserver votre taxi conventionné pour vos rendez-vous obstétriques</h2>
      <p>
        Dès que votre praticien vous remet votre bon de transport, réservez
        votre trajet en ligne en indiquant la date de votre échographie ou de
        votre consultation, votre lieu de prise en charge et le nom de votre
        maternité ou cabinet médical. Nos chauffeurs partenaires, habitués au
        transport de femmes enceintes, assurent un trajet en douceur et sans
        avance de frais.
      </p>
    </BlogLayout>
  );
}
