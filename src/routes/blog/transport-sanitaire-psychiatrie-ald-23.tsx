import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";
import { canonicalLinks } from "~/lib/seoLinks";

export const Route = createFileRoute(
  "/blog/transport-sanitaire-psychiatrie-ald-23",
)({
  head: () => ({
    meta: [
      { title: "Santé Mentale et Psychiatrie : Transport CPAM — Docteur Taxi" },
      {
        name: "description",
        content:
          "Vos soins psychiatriques nécessitent des déplacements réguliers ? Vos droits au taxi conventionné sans avance de frais dans le cadre de l'ALD 23.",
      },
    ],
    links: canonicalLinks("https://docteurtaxi.fr/blog/transport-sanitaire-psychiatrie-ald-23"),
  }),
  component: TransportSanitairePsychiatrieAld23Article,
});

const faqItems = [
  {
    q: "Peut-on prendre un taxi conventionné pour aller voir un psychologue en ville ?",
    a: "Généralement non. Le transport sanitaire est pris en charge pour des consultations médicales (psychiatre) ou des soins en structure (CMP, hôpital). Les séances chez un psychologue libéral classique, hors prescription médicale remboursée, n'ouvrent pas droit au transport.",
  },
  {
    q: "Le chauffeur de taxi est-il informé de ma pathologie psychiatrique ?",
    a: "Non, le secret médical est absolu. Le chauffeur a uniquement connaissance de vos adresses de prise en charge et de destination ainsi que de votre prescription médicale de transport, mais pas de la nature exacte de votre affection.",
  },
];

function TransportSanitairePsychiatrieAld23Article() {
  return (
    <BlogLayout
      category="ALD"
      slug="transport-sanitaire-psychiatrie-ald-23"
      title="Santé mentale (ALD 23) : vos droits au transport médicalisé"
      readingTime="4 min"
      publishedAt="17 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Lorsque l'on évoque le transport sanitaire, on pense spontanément aux
        maladies physiques, aux chirurgies ou à des traitements comme la
        chimiothérapie. Pourtant, les troubles psychiques nécessitent
        souvent un suivi régulier, parfois lourd, qui peut altérer
        temporairement la capacité à se déplacer seul. L'Assurance Maladie
        reconnaît cette réalité en permettant l'accès au taxi conventionné
        pour les soins psychiatriques.
      </p>

      <h2>L'ALD 23 : une prise en charge à 100 %</h2>
      <p>
        Les{" "}
        <Link
          to="/maladies/$ald"
          params={{ ald: "affections-psychiatriques-longue-duree" }}
        >
          affections psychiatriques de longue durée
        </Link>{" "}
        (dépression sévère, troubles bipolaires, schizophrénie, certains
        troubles anxieux invalidants) figurent sur la liste des 30{" "}
        <Link to="/blog/ald-transport">
          Affections de Longue Durée
        </Link>{" "}
        exonérantes, sous le numéro ALD 23. Si votre médecin traitant ou
        votre psychiatre a fait reconnaître votre pathologie en ALD, vos
        soins en lien avec cette maladie, y compris vos déplacements
        médicaux, sont couverts à 100 % : sur présentation d'une ordonnance
        de transport, vous bénéficiez du Tiers-Payant intégral.
      </p>

      <h2>Pour quelles structures de soins ?</h2>
      <p>
        Le médecin peut prescrire un transport assis professionnalisé pour
        vous rendre à vos consultations régulières au sein d'un Centre
        Médico-Psychologique (CMP), en Hôpital de Jour psychiatrique pour des
        ateliers thérapeutiques, ou dans une clinique psychiatrique ou un
        centre hospitalier spécialisé pour une admission en hospitalisation
        complète. Pour des visites fréquentes en hôpital de jour, le
        psychiatre rédige généralement une prescription globale couvrant une
        période donnée ; si ces trajets sont longs et répétés, la{" "}
        <Link to="/blog/traitements-reguliers-taxi-conventionne">
          règle des transports itératifs
        </Link>{" "}
        peut nécessiter un accord préalable de la CPAM.
      </p>

      <h2>Discrétion, bienveillance et sécurité</h2>
      <p>
        Se rendre à un rendez-vous psychiatrique peut générer de l'anxiété,
        et emprunter les transports en commun lors d'une période de
        fragilité (crise d'angoisse, agoraphobie, fatigue liée aux
        traitements) est parfois inenvisageable. Nos chauffeurs partenaires
        sont soumis au secret professionnel et formés au transport de
        patients, avec discrétion et patience, directement de votre porte
        jusqu'à l'accueil de la structure de soins.
      </p>

      <h2>Voyager avec un proche de confiance</h2>
      <p>
        Dans les moments de grande vulnérabilité, la présence d'un proche
        est souvent indispensable. Si votre état psychique la requiert,
        votre médecin peut la prescrire en cochant la case correspondante
        sur l'ordonnance : comme expliqué dans notre guide{" "}
        <Link to="/blog/accompagnant-taxi-conventionne">
          Accompagnant en taxi conventionné
        </Link>
        , votre proche voyage alors avec vous sans frais supplémentaire.
      </p>

      <h2>Comment réserver votre taxi conventionné ?</h2>
      <p>
        Une fois votre{" "}
        <Link to="/blog/pmt-prescription">
          Prescription Médicale de Transport
        </Link>{" "}
        délivrée par votre médecin ou votre psychiatre, planifiez l'ensemble
        de vos rendez-vous sur Docteur Taxi, munissez-vous de votre carte
        Vitale et de votre attestation, et concentrez-vous pleinement sur
        votre parcours thérapeutique.
      </p>
    </BlogLayout>
  );
}
