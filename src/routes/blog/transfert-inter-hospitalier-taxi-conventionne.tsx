import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute(
  "/blog/transfert-inter-hospitalier-taxi-conventionne",
)({
  head: () => ({
    meta: [
      { title: "Transfert Entre Hôpitaux : Prise en Charge du Transport — Docteur Taxi" },
      {
        name: "description",
        content:
          "Vous êtes transféré d'un hôpital à un autre ? Qui organise et paie votre transport en taxi conventionné lors d'un transfert inter-hospitalier.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://docteurtaxi.fr/blog/transfert-inter-hospitalier-taxi-conventionne",
      },
    ],
  }),
  component: TransfertInterHospitalierTaxiConventionneArticle,
});

const faqItems = [
  {
    q: "En tant que famille, puis-je réserver moi-même le taxi conventionné pour le transfert de mon parent ?",
    a: "Non. S'il s'agit d'un transfert inter-hospitalier prescrit par l'équipe médicale, c'est le cadre de santé ou le secrétariat du service d'origine qui se charge de commander le transporteur sanitaire.",
  },
  {
    q: "Dois-je utiliser ma carte Vitale pour payer le transfert entre deux cliniques ?",
    a: "Dans la majorité des transferts inter-établissements, le coût est imputé directement au budget de l'hôpital prescripteur. Vous n'avez donc ni à présenter votre carte Vitale au chauffeur, ni à fournir de prescription médicale de transport classique.",
  },
];

function TransfertInterHospitalierTaxiConventionneArticle() {
  return (
    <BlogLayout
      category="Démarches"
      slug="transfert-inter-hospitalier-taxi-conventionne"
      title="Transfert entre deux hôpitaux : qui organise et paie le transport ?"
      readingTime="4 min"
      publishedAt="19 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Il n'est pas rare qu'au cours d'une hospitalisation, un patient doive
        être orienté vers un autre établissement de santé — pour un examen
        d'imagerie indisponible sur place, ou pour être opéré dans un centre
        disposant d'un plateau technique plus pointu. Qui doit organiser ce
        transport ? Qui règle la facture ? La mécanique du transfert
        inter-hospitalier est très différente d'un trajet classique.
      </p>

      <h2>La responsabilité de l'établissement de santé</h2>
      <p>
        Contrairement aux trajets depuis votre domicile où vous gérez
        vous-même votre{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>
        , le transfert entre deux hôpitaux obéit à une règle stricte :
        l'organisation incombe entièrement à l'hôpital demandeur. C'est
        l'équipe soignante qui détermine le mode de transport adéquat (taxi
        conventionné pour un transport assis, ambulance pour un patient
        alité), et le secrétariat médical qui contacte les transporteurs
        sanitaires. En tant que patient ou{" "}
        <Link to="/blog/transport-sanitaire-proche-demarches">
          proche aidant
        </Link>
        , vous n'avez aucune démarche de réservation à effectuer.
      </p>

      <h2>Transfert provisoire ou définitif</h2>
      <p>
        La facturation de ces trajets ne passe généralement pas par la
        Caisse Primaire d'Assurance Maladie de ville. Pour un transfert
        provisoire (un examen spécialisé l'après-midi avant de revenir dans
        votre chambre d'origine), le coût est pris en charge sur le budget
        propre de l'hôpital d'origine. Pour un transfert définitif (admission
        dans un nouvel hôpital pour y poursuivre vos soins), c'est
        l'établissement qui vous accueille ou celui qui vous transfère qui
        prend en charge la facturation, selon des accords internes. Dans les
        deux cas, vous n'êtes pas impliqué financièrement.
      </p>

      <h2>Aucune avance de frais, aucune démarche administrative</h2>
      <p>
        Le transport étant géré de structure à structure, le système
        habituel du{" "}
        <Link to="/blog/taxi-conventionne-sans-avance-frais">
          Tiers-Payant CPAM
        </Link>{" "}
        n'est pas utilisé ici. Le jour du transfert, vous n'avez pas à
        présenter votre attestation de mutuelle ni votre carte Vitale au
        chauffeur : il facture directement le service comptabilité de
        l'hôpital commanditaire.
      </p>

      <h2>Quand le système classique reprend-il le relais ?</h2>
      <p>
        Le système de transport sur budget hospitalier s'arrête dès que vous
        quittez définitivement le système des soins aigus. Une fois votre{" "}
        <Link to="/blog/retour-domicile-sortie-hopital">
          retour à domicile ou votre départ vers un centre de rééducation
        </Link>{" "}
        décidé, la réglementation de ville classique reprend : le médecin du
        service vous remet une Prescription Médicale de Transport, et il vous
        appartient de réserver votre trajet sur Docteur Taxi selon vos droits
        de prise en charge habituels (65 % ou 100 %).
      </p>
    </BlogLayout>
  );
}
