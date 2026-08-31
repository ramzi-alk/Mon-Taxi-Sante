import { createFileRoute, Link } from "@tanstack/react-router";
import { BlogLayout } from "~/components/BlogLayout";
import { FaqSchema } from "~/components/FaqSchema";

export const Route = createFileRoute(
  "/blog/bagages-materiel-taxi-conventionne",
)({
  head: () => ({
    meta: [
      { title: "Bagages et Matériel en Taxi Conventionné — Docteur Taxi" },
      {
        name: "description",
        content:
          "Valise, déambulateur ou fauteuil roulant : le matériel que vous pouvez emporter dans un taxi conventionné pour votre hospitalisation.",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://docteurtaxi.fr/blog/bagages-materiel-taxi-conventionne",
      },
    ],
  }),
  component: BagagesMaterielTaxiConventionneArticle,
});

const faqItems = [
  {
    q: "Le chauffeur peut-il m'aider à porter ma valise jusqu'à ma chambre d'hôpital ?",
    a: "Le chauffeur vous accompagne de votre porte jusqu'au bureau des admissions ou à l'accueil de votre service, et porte vos bagages légers sur ce trajet. Le portage dans les étages ou le brancardage ne fait pas partie de ses attributions.",
  },
  {
    q: "Puis-je voyager avec mon fauteuil roulant électrique ?",
    a: "Pas dans un taxi conventionné standard : les fauteuils électriques sont lourds et non pliables, ils ne rentrent pas dans un coffre classique. Réservez un Taxi PMR, équipé d'une rampe d'accès adaptée aux fauteuils manuels comme électriques.",
  },
];

function BagagesMaterielTaxiConventionneArticle() {
  return (
    <BlogLayout
      category="Prise en charge"
      slug="bagages-materiel-taxi-conventionne"
      title="Bagages et matériel en taxi conventionné : que peut-on emporter ?"
      readingTime="4 min"
      publishedAt="16 septembre 2026"
    >
      <FaqSchema items={faqItems} />

      <p>
        Un départ pour une admission à l'hôpital ou un séjour en centre de
        rééducation nécessite souvent d'emporter des affaires personnelles :
        valise, trousse de toilette, mais aussi parfois du matériel d'aide à
        la mobilité comme un déambulateur ou des béquilles. Que pouvez-vous
        réellement mettre dans le coffre d'un taxi conventionné ?
      </p>

      <h2>Vos bagages personnels pour une hospitalisation</h2>
      <p>
        Les taxis conventionnés sont des véhicules de tourisme (berlines,
        SUV, breaks) disposant d'un coffre standard. Vous pouvez voyager avec
        une valise de taille moyenne et un sac de voyage : le chauffeur vous
        aide à charger vos effets au départ de votre domicile et à les
        décharger à l'arrivée. Gardez à l'esprit que l'espace n'est pas
        illimité, surtout si vous voyagez avec un{" "}
        <Link to="/blog/accompagnant-taxi-conventionne">
          proche accompagnant
        </Link>{" "}
        qui aurait lui aussi des affaires.
      </p>

      <h2>Les aides à la mobilité : déambulateurs et béquilles</h2>
      <p>
        Le transport assis professionnalisé s'adresse à des patients
        conservant une certaine autonomie, et le transport de matériel
        orthopédique léger est prévu par les chauffeurs. Cannes, béquilles et
        déambulateurs classiques sont acceptés sans problème. Si votre
        déambulateur est un modèle à roulettes (rollator), veillez à ce qu'il
        soit pliable afin de pouvoir être rangé dans le coffre en toute
        sécurité.
      </p>

      <h2>Le cas du fauteuil roulant</h2>
      <p>
        C'est un point de vigilance important. Un taxi conventionné standard
        ne peut accueillir un fauteuil roulant qu'à deux conditions : il doit
        être un modèle manuel et entièrement pliable pour rentrer dans le
        coffre, et vous devez pouvoir effectuer le transfert vers le siège
        passager avec une aide légère à la marche du chauffeur.
      </p>
      <p>
        Si vous ne pouvez pas effectuer ce transfert, ou si votre fauteuil
        est électrique ou non pliable, la solution adaptée est le{" "}
        <Link to="/blog/transport-pmr-personnes-agees">Taxi PMR</Link>, un
        véhicule équipé d'une rampe d'accès et d'un système de fixation
        homologué qui accueille directement le fauteuil, manuel ou
        électrique, sans transfert. Si votre état de santé impose en plus un
        transport allongé, voir notre guide{" "}
        <Link to="/blog/taxi-conventionne-ou-ambulance-rendez-vous">
          taxi conventionné ou ambulance
        </Link>
        .
      </p>

      <h2>L'importance de prévenir à la réservation</h2>
      <p>
        Notre réseau de chauffeurs dispose de berlines classiques, mais aussi
        de breaks et de monospaces offrant un volume de chargement plus
        important. Précisez le matériel que vous emporterez lors de votre
        réservation sur Docteur Taxi — fauteuil roulant pliable, grosse
        valise pour un départ en centre SSR — afin que nous affections un
        chauffeur disposant d'un véhicule adapté, pour un trajet fluide et
        sans avance de frais.
      </p>
    </BlogLayout>
  );
}
