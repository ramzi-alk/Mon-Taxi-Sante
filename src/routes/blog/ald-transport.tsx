import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";

export const Route = createFileRoute("/blog/ald-transport")({
  head: () => ({
    meta: [
      { title: "Transport ALD : tout savoir — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Affection de Longue Durée et transport sanitaire : prise en charge à 100 %, pathologies concernées et démarches à suivre.",
      },
    ],
    links: [{ rel: "canonical", href: "https://mon-taxi-sante.com/blog/ald-transport" }],
  }),
  component: AldTransportArticle,
});

function AldTransportArticle() {
  return (
    <BlogLayout
      category="ALD"
      title="Transport ALD : tout savoir"
      readingTime="5 min"
      publishedAt="9 avril 2026"
    >
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
