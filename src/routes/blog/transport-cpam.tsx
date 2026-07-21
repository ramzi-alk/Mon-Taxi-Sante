import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/transport-cpam")({
  head: () => ({
    meta: [
      { title: "Transport Remboursé Assurance Maladie : 100% ou 65% — Docteur Taxi" },
      {
        name: "description",
        content:
          "Dialyse, chimiothérapie, ALD, maternité : quelles situations ouvrent droit à un transport remboursé à 100% ou 65%, comment fonctionne le Tiers-Payant et les démarches à suivre.",
      },
    ],
    links: [{ rel: "canonical", href: "https://mon-taxi-sante.com/blog/transport-cpam" }],
  }),
  component: TransportCpamArticle,
});

const faqItems = [
  {
    q: "Quelles situations sont concernées ?",
    a: "Le transport est remboursable lorsqu'il est lié à des soins ou un traitement en lien avec une prescription médicale : dialyse rénale, chimiothérapie et radiothérapie, rééducation fonctionnelle, consultations dans le cadre d'une Affection de Longue Durée (ALD), soins psychiatriques, transport lié à la maternité, hospitalisation et sorties d'hospitalisation.",
  },
  {
    q: "Quel est le niveau de prise en charge ?",
    a: "ALD, maternité, CMU-C, CSS : prise en charge à 100 %, sans avance de frais via le Tiers-Payant. Assuré standard : prise en charge à 65 % du tarif conventionné, le reste pouvant être couvert par une mutuelle. Sans prescription ni prise en charge : le transport reste à la charge du patient au tarif en vigueur.",
  },
  {
    q: "Comment fonctionne le Tiers-Payant ?",
    a: "Lorsque vous bénéficiez d'une prise en charge à 100 % et disposez d'une Prescription Médicale de Transport (PMT) valide, le chauffeur conventionné facture directement l'Assurance Maladie. Vous n'avez rien à régler ni à avancer le jour du transport.",
  },
  {
    q: "Quelles démarches effectuer ?",
    a: "Demandez à votre médecin une Prescription Médicale de Transport si votre situation le justifie. Réservez votre taxi conventionné en indiquant votre statut de prise en charge et en joignant votre PMT. Le jour J, présentez votre carte Vitale et votre PMT au chauffeur.",
  },
];

function TransportCpamArticle() {
  return (
    <BlogLayout
      category="Prise en charge"
      slug="transport-cpam"
      title="Transport pris en charge Assurance Maladie : tout savoir"
      readingTime="5 min"
      publishedAt="12 mars 2026"
    >
      <FaqSchema items={faqItems} />
      <p>
        En France, l'Assurance Maladie peut prendre en charge tout ou partie
        des frais de transport vers un établissement de santé, sous
        certaines conditions. Voici l'essentiel à connaître avant de
        réserver votre taxi conventionné.
      </p>

      <h2>Quelles situations sont concernées ?</h2>
      <p>
        Le transport est remboursable lorsqu'il est lié à des soins ou un
        traitement en lien avec une prescription médicale. Les situations
        les plus courantes sont :
      </p>
      <ul>
        <li>Dialyse rénale</li>
        <li>Chimiothérapie et radiothérapie</li>
        <li>Rééducation fonctionnelle</li>
        <li>Consultations dans le cadre d'une Affection de Longue Durée (ALD)</li>
        <li>Soins psychiatriques</li>
        <li>Transport lié à la maternité</li>
        <li>Hospitalisation et sorties d'hospitalisation</li>
      </ul>

      <h2>Quel est le niveau de prise en charge ?</h2>
      <p>
        Le taux de remboursement dépend de votre situation :
      </p>
      <ul>
        <li><strong>ALD, maternité, CMU-C, CSS</strong> : prise en charge à 100 %, sans avance de frais via le Tiers-Payant.</li>
        <li><strong>Assuré standard</strong> : prise en charge à 65 % du tarif conventionné, le reste pouvant être couvert par une mutuelle.</li>
        <li><strong>Sans prescription ni prise en charge</strong> : le transport reste à la charge du patient au tarif en vigueur.</li>
      </ul>

      <h2>Comment fonctionne le Tiers-Payant ?</h2>
      <p>
        Lorsque vous bénéficiez d'une prise en charge à 100 % et disposez
        d'une Prescription Médicale de Transport (PMT) valide, le chauffeur
        conventionné facture directement l'Assurance Maladie. Vous n'avez
        rien à régler ni à avancer le jour du transport.
      </p>

      <h2>Quelles démarches effectuer ?</h2>
      <ol>
        <li>Demandez à votre médecin une Prescription Médicale de Transport si votre situation le justifie.</li>
        <li>
          Réservez votre taxi conventionné en indiquant votre statut de
          prise en charge et en joignant votre PMT.
        </li>
        <li>
          Le jour J, présentez votre carte Vitale et votre PMT au chauffeur.
        </li>
      </ol>
      <p>
        Pour plus de détails sur la prescription elle-même, consultez notre
        guide{" "}
        <Link to="/blog/pmt-prescription">
          Prescription médicale de transport (PMT) : mode d'emploi
        </Link>
        .
      </p>
    </BlogLayout>
  );
}
