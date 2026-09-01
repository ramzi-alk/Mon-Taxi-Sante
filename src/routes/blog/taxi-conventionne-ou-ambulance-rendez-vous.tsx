import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute(
  "/blog/taxi-conventionne-ou-ambulance-rendez-vous",
)({
  head: () => ({
    meta: [
      { title: "Taxi Conventionné ou Ambulance : Que Choisir ? — Docteur Taxi" },
      {
        name: "description",
        content:
          "Taxi conventionné ou ambulance pour votre rendez-vous médical ? Les critères de décision, qui tranche, et les règles de prise en charge CPAM.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/taxi-conventionne-ou-ambulance-rendez-vous"),
  }),
  component: TaxiConventionneOuAmbulanceRendezVousArticle,
});

const faqItems = [
  {
    q: "Puis-je exiger une ambulance si mon médecin a prescrit un taxi conventionné ?",
    a: "Non. Le mode de transport indiqué sur la Prescription Médicale de Transport s'impose à vous. Si le médecin a coché transport assis professionnalisé (taxi ou VSL), utiliser une ambulance expose à un refus de remboursement.",
  },
  {
    q: "Le chauffeur de taxi conventionné peut-il m'aider à monter les étages de mon immeuble ?",
    a: "Il assure un accompagnement à la marche, vous aide à monter et descendre du véhicule, et peut porter un bagage léger. Il n'est en revanche pas habilité à effectuer un brancardage ou un portage dans les escaliers : si votre état l'exige, le médecin doit prescrire une ambulance.",
  },
  {
    q: "En cas d'urgence médicale, dois-je appeler un taxi ou une ambulance ?",
    a: "Ni l'un ni l'autre. En cas d'urgence vitale ou de symptômes graves et soudains (douleur thoracique, perte de connaissance), composez immédiatement le 15 (SAMU) ou le 112, qui déclenchera les secours adaptés.",
  },
  {
    q: "Le Tiers-Payant fonctionne-t-il de la même façon pour les deux transports ?",
    a: "Oui. Que vous voyagiez en taxi conventionné, en VSL ou en ambulance, le principe de facturation est le même : avec une PMT valide et des droits à jour, le Tiers-Payant s'applique et évite l'avance de frais.",
  },
];

function TaxiConventionneOuAmbulanceRendezVousArticle() {
  return (
    <BlogLayout
      category="Transport sanitaire"
      slug="taxi-conventionne-ou-ambulance-rendez-vous"
      title="Taxi conventionné ou ambulance : quel transport médical choisir ?"
      readingTime="5 min"
      publishedAt="7 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Lorsque vous devez vous rendre à l'hôpital ou chez un spécialiste,
        la question du transport se pose rapidement. L'Assurance Maladie
        participe au financement de vos déplacements médicaux, mais
        distingue précisément les types de véhicules. Qui décide entre taxi
        conventionné et ambulance, et sur quels critères ? Voici de quoi
        organiser votre trajet sereinement et éviter les mauvaises surprises
        administratives.
      </p>

      <h2>Deux catégories de transport sanitaire</h2>
      <p>
        Pour l'Assurance Maladie, tous les véhicules sanitaires ne répondent
        pas aux mêmes besoins cliniques. Le{" "}
        <Link to="/blog/vsl-ou-taxi-conventionne">
          transport assis professionnalisé
        </Link>{" "}
        (VSL ou taxi conventionné) s'adresse aux patients capables de
        voyager assis, conduits par des professionnels formés aux premiers
        secours. L'ambulance est un véhicule aménagé pour un transport en
        position allongée ou demi-assise, avec un équipage d'au moins un
        ambulancier diplômé d'État et du matériel médical embarqué (oxygène,
        surveillance).
      </p>

      <h2>Quand le taxi conventionné est-il adapté ?</h2>
      <p>
        Le taxi conventionné est privilégié pour la majorité des soins
        réguliers et consultations de suivi. Il est prescrit si vous pouvez
        voyager assis sans risque, sans surveillance médicale constante,
        sans besoin d'oxygène ni de brancardage, et avec au plus une aide
        légère à la marche. C'est le mode adapté pour une séance de
        radiothérapie, une dialyse, ou une consultation post-opératoire.
      </p>

      <h2>Dans quels cas l'ambulance est-elle obligatoire ?</h2>
      <p>
        L'ambulance est réservée aux patients dont l'état de santé est
        incompatible avec une posture assise ou requiert une assistance
        technique : obligation de voyager allongé ou demi-assis (suite à une
        chirurgie orthopédique majeure, de fortes douleurs lombaires),
        nécessité d'un portage ou d'un brancardage (impossibilité de marcher,
        étage sans ascenseur), besoin d'une surveillance paramédicale active
        pendant le trajet, ou conditions d'asepsie rigoureuses.
      </p>

      <h2>Qui décide du mode de transport ?</h2>
      <p>
        Le choix entre taxi et ambulance n'est pas une question de
        préférence personnelle : cette décision relève de votre médecin
        prescripteur. En rédigeant votre{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>
        , il applique le principe du transport le moins onéreux compatible
        avec votre état de santé. S'il estime que vous pouvez voyager assis
        en sécurité, il coche la case du transport assis professionnalisé.
        Réserver une ambulance alors que votre ordonnance indique un taxi —
        ou l'inverse — expose au refus de remboursement par l'Assurance
        Maladie.
      </p>

      <h2>La prise en charge CPAM : y a-t-il une différence de taux ?</h2>
      <p>
        Le taux de remboursement (65 % ou 100 %) ne dépend pas du véhicule
        emprunté, mais de la nature de votre maladie et de vos droits
        administratifs. Que le médecin prescrive une ambulance ou un taxi
        conventionné, des soins liés à une{" "}
        <Link to="/blog/ald-transport">
          Affection de Longue Durée
        </Link>{" "}
        exonérante sont couverts à 100 % dans les deux cas ; seul le coût de
        base facturé à l'Assurance Maladie diffère selon le véhicule, ce qui
        explique le contrôle rigoureux de l'adéquation entre état du patient
        et mode de transport prescrit.
      </p>
      <p>
        Si votre médecin a opté pour le transport assis professionnalisé,
        vous pouvez planifier votre trajet dès aujourd'hui sur Docteur Taxi
        et bénéficier d'un trajet sans avance de frais.
      </p>
    </BlogLayout>
  );
}
