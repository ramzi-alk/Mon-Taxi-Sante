import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute("/blog/vsl-ou-taxi-conventionne")({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné, VSL ou Ambulance : Quelle Différence ? — Docteur Taxi" },
      {
        name: "description",
        content:
          "Taxi conventionné, VSL (Véhicule Sanitaire Léger) ou ambulance : les différences de véhicule, de conducteur, de tarif et comment choisir selon votre état de santé.",
      },
    ],
    links: [{ rel: "canonical", href: "https://docteurtaxi.fr/blog/vsl-ou-taxi-conventionne" }],
  }),
  component: VslOuTaxiConventionneArticle,
});

const faqItems = [
  {
    q: "Qu'est-ce qu'un taxi conventionné ?",
    a: "Un taxi conventionné est un taxi classique dont le chauffeur a signé la convention nationale avec l'Assurance Maladie pour transporter des patients. Il peut aussi effectuer des courses libres en dehors du transport médical. Le transport se fait toujours assis.",
  },
  {
    q: "Qu'est-ce qu'un VSL (Véhicule Sanitaire Léger) ?",
    a: "Un VSL est un véhicule sanitaire exploité par une entreprise de transport sanitaire agréée par l'Agence Régionale de Santé (ARS), dédié exclusivement au transport de patients (pas de course libre). Le conducteur est titulaire d'une attestation d'auxiliaire ambulancier. Le transport se fait également assis.",
  },
  {
    q: "Et l'ambulance, c'est différent ?",
    a: "Oui. L'ambulance est réservée aux patients qui doivent être transportés allongés (sur brancard) ou nécessitant une surveillance médicale pendant le trajet. Le véhicule est équipé de matériel médical et le conducteur est titulaire du Diplôme d'État d'ambulancier (DEA).",
  },
  {
    q: "Le tarif est-il le même pour les trois ?",
    a: "Non. Chaque catégorie de véhicule relève d'une convention et d'une grille tarifaire distinctes. Le taxi conventionné suit la convention nationale taxi ; le VSL et l'ambulance relèvent de la convention des transporteurs sanitaires.",
  },
  {
    q: "Comment choisir entre taxi conventionné, VSL et ambulance ?",
    a: "Pour un transport assis simple, le taxi conventionné suffit. Si vous êtes en fauteuil roulant, un Taxi PMR (variante du taxi conventionné avec rampe d'accès) est adapté. Si votre état de santé nécessite un accompagnement sanitaire assis, le VSL est indiqué. Si vous devez être transporté allongé ou sous surveillance médicale, seule l'ambulance convient.",
  },
];

function VslOuTaxiConventionneArticle() {
  return (
    <BlogLayout
      category="Transport sanitaire"
      slug="vsl-ou-taxi-conventionne"
      title="Taxi conventionné, VSL ou ambulance : quelle différence ?"
      readingTime="4 min"
      publishedAt="21 juillet 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Taxi conventionné, VSL, ambulance : ces trois modes de transport
        sanitaire sont souvent confondus alors qu'ils répondent à des besoins
        différents, avec chacun leur propre agrément, leur propre conducteur
        et leur propre tarification. Voici comment les distinguer et choisir
        le bon véhicule pour votre trajet médical.
      </p>

      <h2>Qu'est-ce qu'un taxi conventionné ?</h2>
      <p>
        Un taxi conventionné est un taxi « classique », habilité par une
        Autorisation de Stationnement (ADS), dont le chauffeur a signé la
        convention nationale taxi avec l'Assurance Maladie. Contrairement au
        VSL, il peut effectuer des courses libres en dehors du transport de
        patients. Le transport se fait toujours en position assise, dans un
        véhicule qui n'est pas médicalisé.
      </p>

      <h2>Qu'est-ce qu'un VSL (Véhicule Sanitaire Léger) ?</h2>
      <p>
        Le VSL est un véhicule sanitaire exploité par une entreprise de
        transport sanitaire agréée par l'Agence Régionale de Santé (ARS),
        dédié exclusivement au transport de patients : contrairement au taxi,
        il n'effectue aucune course libre. Le conducteur est titulaire d'une
        attestation d'auxiliaire ambulancier. Comme le taxi conventionné, le
        transport se fait assis, mais dans un cadre davantage encadré
        sanitairement.
      </p>

      <h2>Et l'ambulance ?</h2>
      <p>
        L'ambulance est réservée aux patients qui doivent être transportés
        allongés (sur brancard) ou dont l'état de santé nécessite une
        surveillance médicale pendant le trajet. Le véhicule est équipé de
        matériel de premiers secours et le conducteur est titulaire du
        Diplôme d'État d'ambulancier (DEA).
      </p>

      <h2>Comment choisir entre les trois ?</h2>
      <ul>
        <li>
          <strong>Transport assis simple</strong>, sans aide particulière :
          taxi conventionné.
        </li>
        <li>
          <strong>Fauteuil roulant</strong> (manuel ou électrique) : Taxi PMR,
          une variante du taxi conventionné équipée d'une rampe d'accès et
          d'une fixation homologuée.
        </li>
        <li>
          <strong>Accompagnement sanitaire assis</strong> pour un état de
          santé plus fragile, sans besoin de brancard : VSL.
        </li>
        <li>
          <strong>Transport allongé ou surveillance médicale</strong> pendant
          le trajet : ambulance.
        </li>
      </ul>

      <h2>Le tarif est-il le même pour les trois ?</h2>
      <p>
        Non. Chaque catégorie relève d'une convention et d'une grille
        tarifaire distinctes : le taxi conventionné suit la{" "}
        <Link to="/tarifs-cpam">convention nationale taxi 2025</Link>, tandis
        que le VSL et l'ambulance relèvent de la convention des transporteurs
        sanitaires. Dans les trois cas, la prise en charge par l'Assurance
        Maladie suit les mêmes règles : 100 % en ALD, maternité ou CMU-C/CSS
        avec une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>
        , 65 % pour un assuré standard.
      </p>

      <h2>Que propose Docteur Taxi ?</h2>
      <p>
        Docteur Taxi permet de réserver en ligne un taxi conventionné, un VSL
        ou un Taxi PMR, avec Tiers-Payant intégral si votre situation le
        permet. Le formulaire de réservation vous recommande le véhicule
        adapté selon vos besoins (fauteuil roulant, accompagnement
        particulier). Le transport en ambulance, qui nécessite un brancard,
        n'est pas proposé sur la plateforme.
      </p>
    </BlogLayout>
  );
}
