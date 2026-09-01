import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute(
  "/blog/transport-medical-plusieurs-rendez-vous",
)({
  head: () => ({
    meta: [
      { title: "Transport Médical : Plusieurs Rendez-vous en Taxi — Docteur Taxi" },
      {
        name: "description",
        content:
          "Comment organiser plusieurs rendez-vous médicaux le même jour avec un taxi conventionné ? Règles de la PMT et réservation sans avance de frais.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/transport-medical-plusieurs-rendez-vous"),
  }),
  component: TransportMedicalPlusieursRendezVousArticle,
});

const faqItems = [
  {
    q: "Le chauffeur peut-il m'emmener faire une course personnelle entre deux rendez-vous ?",
    a: "Non. Le taxi conventionné est un transport sanitaire encadré par l'Assurance Maladie : le trajet pris en charge relie votre domicile au lieu de soins. Les arrêts pour un motif personnel (pharmacie, courses, banque) ne sont pas couverts par le Tiers-Payant.",
  },
  {
    q: "Faut-il une ordonnance pour chaque spécialiste consulté le même jour ?",
    a: "La Prescription Médicale de Transport couvre un trajet. Si vos rendez-vous ont lieu dans le même établissement, une seule PMT aller-retour suffit. S'ils sont dans des lieux différents, la PMT doit préciser ce parcours en plusieurs étapes.",
  },
  {
    q: "Si mon premier rendez-vous prend du retard, le chauffeur part-il sans moi ?",
    a: "Si l'attente est de courte durée, le chauffeur patiente. Si le retard est plus important, il peut repartir sur une autre course : un véhicule revient vous chercher dès que vous signalez la fin de votre consultation.",
  },
  {
    q: "Vaut-il mieux un VSL ou un taxi conventionné pour des rendez-vous multiples ?",
    a: "Le taxi conventionné est souvent plus adapté : le VSL fonctionne sur le principe du transport partagé, ce qui offre moins de flexibilité si vos horaires de consultation glissent.",
  },
];

function TransportMedicalPlusieursRendezVousArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="transport-medical-plusieurs-rendez-vous"
      title="Transport médical : gérer plusieurs rendez-vous en taxi conventionné"
      readingTime="5 min"
      publishedAt="6 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Bilan de santé complet, suivi d'une maladie chronique ou préparation
        à une intervention : il n'est pas rare d'enchaîner une prise de sang,
        une imagerie médicale et une consultation spécialiste sur une même
        journée. Organiser ces déplacements peut vite devenir un défi
        logistique et une source de fatigue. Voici comment coordonner
        plusieurs rendez-vous en taxi conventionné, sans stress.
      </p>

      <h2>Pourquoi grouper ses rendez-vous médicaux ?</h2>
      <p>
        Lorsque cela est médicalement et administrativement possible, il est
        recommandé de grouper vos rendez-vous sur une même demi-journée,
        surtout s'ils ont lieu au sein du même établissement. Cela limite les
        allers-retours fatigants depuis votre domicile, et un seul trajet
        aller-retour pour consulter plusieurs praticiens dans la même
        structure est plus simple à justifier et à prescrire que des
        allers-retours distincts à quelques jours d'intervalle.
      </p>

      <h2>Une prescription adaptée selon vos rendez-vous</h2>
      <p>
        Que vous ayez un ou plusieurs rendez-vous, la règle de base reste
        incontournable : pour être remboursé, chaque déplacement doit être
        justifié par une{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>
        . Si tous vos rendez-vous ont lieu au même endroit (par exemple une
        échographie puis une consultation dans la même clinique), une seule
        prescription indiquant un aller-retour suffit. Si vos rendez-vous
        sont dans des lieux différents — un laboratoire en centre-ville puis
        un hôpital en périphérie —, le trajet est dit « triangulaire » : le
        médecin prescripteur doit alors détailler ce parcours en plusieurs
        étapes pour que la totalité des kilomètres soit prise en charge.
      </p>

      <h2>Le chauffeur peut-il attendre entre deux consultations ?</h2>
      <p>
        Si l'intervalle entre deux consultations dans un même établissement
        est court, l'Assurance Maladie ne prend généralement pas en charge le
        temps d'attente du chauffeur, qui repart effectuer une autre course.
        Il vous suffit alors de prévenir la plateforme ou directement votre
        chauffeur une fois votre dernier rendez-vous terminé : un véhicule
        est envoyé dans les meilleurs délais pour votre trajet retour.
      </p>

      <h2>Quelle prise en charge financière pour plusieurs rendez-vous ?</h2>
      <p>
        Avoir plusieurs rendez-vous ne change pas les règles de remboursement
        : le taux dépend de votre situation médicale globale (100 % en{" "}
        <Link to="/blog/ald-transport">ALD</Link>, accident du travail ou
        invalidité ; 65 % pour des soins courants — voir notre guide{" "}
        <Link to="/blog/transport-cpam">
          Transport pris en charge Assurance Maladie
        </Link>{" "}
        pour le détail). Dans tous les cas, le{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Tiers-Payant s'applique
        </Link>{" "}
        : en présentant votre carte Vitale, votre attestation de mutuelle et
        votre PMT, vous n'avez aucune avance de frais à réaliser.
      </p>

      <h2>Bien organiser votre journée avec Docteur Taxi</h2>
      <p>
        Pour que votre parcours de soins se déroule sans accroc :
      </p>
      <ol>
        <li>
          détaillez votre parcours lors de la réservation : heures de
          rendez-vous et adresses exactes des différents services ;
        </li>
        <li>
          prévoyez une marge de sécurité sur l'heure de retour estimée,
          l'attente en salle de consultation étant fréquente ;
        </li>
        <li>
          restez joignable pour que le chauffeur puisse vous prévenir de son
          arrivée, sans avoir à attendre debout devant l'établissement.
        </li>
      </ol>
    </BlogLayout>
  );
}
