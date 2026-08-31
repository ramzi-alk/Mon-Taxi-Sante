import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute(
  "/blog/annulation-retard-taxi-conventionne",
)({
  head: () => ({
    meta: [
      { title: "Annulation et Retard de Rendez-vous en Taxi — Docteur Taxi" },
      {
        name: "description",
        content:
          "Votre rendez-vous médical est annulé ou en retard ? Comment gérer ces imprévus avec votre taxi conventionné, et s'il y a des frais à prévoir.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://docteurtaxi.fr/blog/annulation-retard-taxi-conventionne",
      },
    ],
  }),
  component: AnnulationRetardTaxiConventionneArticle,
});

const faqItems = [
  {
    q: "Vais-je payer des frais d'annulation si je décommande mon taxi à la dernière minute ?",
    a: "Non. Contrairement à une réservation de train ou d'avion, l'annulation d'un transport sanitaire pour raison médicale ne génère aucun frais pour le patient. L'Assurance Maladie ne facture pas de pénalités.",
  },
  {
    q: "L'Assurance Maladie dédommage-t-elle le chauffeur si la course est annulée ?",
    a: "Non, une course non réalisée n'est pas payée par la Sécurité sociale. Le chauffeur n'est pas rémunéré pour un trajet annulé, d'où l'importance de prévenir la plateforme dès que possible.",
  },
];

function AnnulationRetardTaxiConventionneArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="annulation-retard-taxi-conventionne"
      title="Annulation ou retard de rendez-vous : quid de votre taxi ?"
      readingTime="4 min"
      publishedAt="18 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Dans le parcours de soins, les imprévus sont monnaie courante : un
        médecin retenu par une urgence, un examen annulé, un pic de fatigue
        vous empêchant de vous rendre à votre séance. Lorsque vous avez
        réservé un taxi conventionné, ces aléas génèrent souvent un stress
        supplémentaire. Dois-je payer des frais d'annulation ? Le chauffeur
        va-t-il repartir sans moi ?
      </p>

      <h2>Que se passe-t-il si votre rendez-vous est annulé ?</h2>
      <p>
        Si l'hôpital ou votre spécialiste annule votre consultation la
        veille ou le matin même, la règle est de prévenir votre transporteur
        le plus rapidement possible. Côté facturation, rassurez-vous : vous
        n'avez rien à payer. Le transport sanitaire fonctionne sur un
        principe de service rendu, l'Assurance Maladie ne réglant que les
        trajets effectivement réalisés — aucun frais d'annulation ne peut
        être réclamé au patient. En prévenant rapidement, vous permettez
        simplement au chauffeur de réorganiser sa tournée pour un autre
        patient qui en aurait besoin.
      </p>

      <h2>Gérer un retard en salle d'attente</h2>
      <p>
        Si l'heure de retour estimée à la réservation n'est pas respectée à
        cause d'un retard en consultation, il vous suffit de contacter la
        plateforme ou votre chauffeur une fois le rendez-vous terminé : un
        véhicule est envoyé dans les meilleurs délais. Le détail de cette
        gestion de l'attente est expliqué dans notre guide{" "}
        <Link to="/blog/transport-medical-plusieurs-rendez-vous">
          gérer plusieurs rendez-vous médicaux
        </Link>
        .
      </p>

      <h2>Reporter son transport à une nouvelle date</h2>
      <p>
        Votre rendez-vous a été décalé à la semaine suivante ? Il suffit de
        modifier votre réservation sur Docteur Taxi. Côté administratif, il
        n'est généralement pas nécessaire de demander une nouvelle{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        à votre médecin : tant que le motif médical, le lieu de consultation
        et le mode de transport restent strictement identiques, l'ordonnance
        initiale reste valable pour la nouvelle date. Vérifiez simplement que
        la date de prescription reste antérieure au jour de votre nouveau
        trajet, condition indispensable pour que le{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Tiers-Payant intégral
        </Link>{" "}
        soit validé.
      </p>

      <h2>La réactivité du service Docteur Taxi</h2>
      <p>
        La maladie impose son propre rythme. Notre plateforme est conçue
        pour absorber les modifications de dernière minute : un simple appel
        ou une modification via votre espace suffit pour réajuster votre
        transport, sans avance de frais.
      </p>
    </BlogLayout>
  );
}
