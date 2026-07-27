import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/ald-transport")({
  head: () => ({
    meta: [
      { title: "Transport ALD Remboursé à 100% : Conditions — Docteur Taxi" },
      {
        name: "description",
        content:
          "ALD et transport sanitaire : prise en charge à 100% avec Prescription Médicale de Transport, pathologies concernées, démarches et Tiers-Payant sans avance de frais.",
      },
    ],
    links: [{ rel: "canonical", href: "https://docteurtaxi.fr/blog/ald-transport" }],
  }),
  component: AldTransportArticle,
});

const faqItems = [
  {
    q: "Qu'est-ce qu'une Affection de Longue Durée (ALD) ?",
    a: "Une ALD est une maladie chronique nécessitant un suivi et des soins prolongés, reconnue par l'Assurance Maladie. Elle ouvre droit à une exonération du ticket modérateur, c'est-à-dire à une prise en charge à 100 % des soins en lien avec la pathologie, y compris le transport.",
  },
  {
    q: "Quelles pathologies sont concernées ?",
    a: "La liste des ALD dites « exonérantes » comprend notamment l'insuffisance rénale chronique nécessitant une dialyse, les cancers nécessitant chimiothérapie ou radiothérapie, le diabète de type 1 et de type 2, les affections psychiatriques de longue durée, les maladies cardiovasculaires graves, ainsi que la sclérose en plaques et autres affections neurologiques.",
  },
  {
    q: "Comment le transport est-il pris en charge en ALD ?",
    a: "Si le transport est en lien direct avec votre ALD et fait l'objet d'une Prescription Médicale de Transport, il est remboursé à 100 % du tarif conventionné. Le Tiers-Payant s'applique : vous n'avancez aucun frais, le chauffeur facture directement l'Assurance Maladie.",
  },
  {
    q: "Quelles démarches effectuer ?",
    a: "Faites reconnaître votre ALD par votre médecin traitant, qui établit un protocole de soins avec l'Assurance Maladie. Pour chaque transport lié à l'ALD, demandez une Prescription Médicale de Transport. Déclarez votre statut ALD lors de votre réservation et joignez votre PMT.",
  },
  {
    q: "Le transport non lié à l'ALD est-il aussi pris en charge à 100 % ?",
    a: "Non. Seuls les transports en lien direct avec la pathologie exonérante bénéficient d'une prise en charge à 100 %. Un transport sans rapport avec votre ALD suit le régime standard, remboursé à 65 %.",
  },
];

function AldTransportArticle() {
  return (
    <BlogLayout
      category="ALD"
      slug="ald-transport"
      title="Transport ALD : tout savoir"
      readingTime="5 min"
      publishedAt="9 avril 2026"
    >
      <FaqSchema items={faqItems} />
      <h2>Qu'est-ce qu'une Affection de Longue Durée (ALD) ?</h2>
      <p>
        Une ALD est une maladie chronique nécessitant un suivi et des soins
        prolongés, reconnue par l'Assurance Maladie. Elle ouvre droit à une
        exonération du ticket modérateur, c'est-à-dire à une prise en charge
        à 100 % des soins en lien avec la pathologie, y compris le
        transport.
      </p>

      <h2>Quelles pathologies sont concernées ?</h2>
      <p>
        La liste des ALD dites « exonérantes » comprend notamment :
      </p>
      <ul>
        <li>Insuffisance rénale chronique nécessitant une dialyse</li>
        <li>Cancers nécessitant chimiothérapie ou radiothérapie</li>
        <li>Diabète de type 1 et de type 2</li>
        <li>Affections psychiatriques de longue durée</li>
        <li>Maladies cardiovasculaires graves</li>
        <li>Sclérose en plaques et autres affections neurologiques</li>
      </ul>

      <h2>Comment le transport est-il pris en charge en ALD ?</h2>
      <p>
        Si le transport est en lien direct avec votre ALD et fait l'objet
        d'une Prescription Médicale de Transport, il est remboursé à 100 %
        du tarif conventionné. Le Tiers-Payant s'applique : vous n'avancez
        aucun frais, le chauffeur facture directement l'Assurance Maladie.
      </p>

      <h2>Quelles démarches effectuer ?</h2>
      <ol>
        <li>
          Faites reconnaître votre ALD par votre médecin traitant, qui
          établit un protocole de soins avec l'Assurance Maladie.
        </li>
        <li>
          Pour chaque transport lié à l'ALD, demandez une Prescription
          Médicale de Transport.
        </li>
        <li>
          Déclarez votre statut ALD lors de votre réservation et joignez
          votre PMT.
        </li>
      </ol>

      <h2>Le transport non lié à l'ALD est-il aussi pris en charge à 100 % ?</h2>
      <p>
        Non. Seuls les transports en lien direct avec la pathologie
        exonérante bénéficient d'une prise en charge à 100 %. Un transport
        sans rapport avec votre ALD suit le régime standard, remboursé à
        65 %.
      </p>
      <p>
        Pour en savoir plus sur la prescription nécessaire à cette prise en
        charge, consultez notre guide{" "}
        <Link to="/blog/pmt-prescription">
          Prescription médicale de transport (PMT) : mode d'emploi
        </Link>
        .
      </p>
    </BlogLayout>
  );
}
