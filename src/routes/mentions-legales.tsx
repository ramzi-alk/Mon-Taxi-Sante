import { createFileRoute } from "@tanstack/react-router";
import { LegalPageLayout } from "~/components/LegalPageLayout";
import { CONTACT_PHONE_DISPLAY, CONTACT_EMAIL } from "~/lib/contact";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Mentions légales du site Mon Taxi Santé : éditeur, hébergement, propriété intellectuelle et droit applicable.",
      },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <LegalPageLayout title="Mentions légales" lastUpdated="25 juin 2026">
      <h2>Éditeur du site</h2>
      <p>Le site mon-taxi-sante.com est édité par :</p>
      <ul>
        <li>Mon Taxi Santé SAS [forme juridique et capital social à compléter]</li>
        <li>Siège social : [adresse à compléter]</li>
        <li>SIRET : [à compléter]</li>
        <li>RCS : [à compléter]</li>
        <li>Directeur de la publication : [nom à compléter]</li>
        <li>Contact : {CONTACT_EMAIL} — {CONTACT_PHONE_DISPLAY} (appel gratuit)</li>
      </ul>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina,
        CA 91723, États-Unis.
      </p>
      <p>
        Les données personnelles et données de santé des utilisateurs sont
        stockées sur une infrastructure certifiée Hébergeur de Données de
        Santé (HDS), opérée par [prestataire HDS à compléter], conformément
        à la réglementation applicable aux données de santé en France.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus présents sur ce site (textes, logos,
        graphismes, structure) est la propriété exclusive de Mon Taxi Santé
        SAS, sauf mention contraire. Toute reproduction, représentation ou
        diffusion, totale ou partielle, sans autorisation préalable est
        interdite.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Mon Taxi Santé met tout en œuvre pour assurer l'exactitude des
        informations diffusées sur le site, mais ne peut garantir l'absence
        d'erreur ou d'omission. L'utilisation des informations du site se
        fait sous la seule responsabilité de l'utilisateur.
      </p>

      <h2>Liens hypertextes</h2>
      <p>
        Le site peut contenir des liens vers des sites tiers. Mon Taxi Santé
        n'exerce aucun contrôle sur ces sites et décline toute responsabilité
        quant à leur contenu.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Les présentes mentions légales sont soumises au droit français. Tout
        litige relatif à leur interprétation ou leur exécution relève de la
        compétence des tribunaux français.
      </p>
    </LegalPageLayout>
  );
}
