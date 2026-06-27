import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPageLayout } from "~/components/LegalPageLayout";
import { CONTACT_PHONE_DISPLAY } from "~/lib/contact";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions Générales de Vente — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Conditions Générales de Vente de Mon Taxi Santé : réservation, prise en charge Assurance Maladie, annulation et responsabilité.",
      },
    ],
  }),
  component: CgvPage,
});

function CgvPage() {
  return (
    <LegalPageLayout
      title="Conditions Générales de Vente"
      lastUpdated="25 juin 2026"
    >
      <h2>Article 1 — Objet</h2>
      <p>
        Les présentes Conditions Générales de Vente (CGV) régissent les
        modalités de réservation et de fourniture des prestations de
        transport sanitaire conventionné proposées via le site
        mon-taxi-sante.com. Toute réservation implique l'acceptation pleine et
        entière des présentes CGV.
      </p>

      <h2>Article 2 — Réservation</h2>
      <p>
        La réservation s'effectue en ligne via le formulaire de réservation
        ou par téléphone au {CONTACT_PHONE_DISPLAY}. Le patient s'engage à fournir des
        informations exactes (adresses, créneau souhaité, statut de prise en
        charge, besoins spécifiques). Une confirmation est envoyée par SMS et
        email dès qu'un chauffeur conventionné accepte la course.
      </p>

      <h2>Article 3 — Prise en charge Assurance Maladie et tarifs</h2>
      <p>
        Les tarifs appliqués sont ceux de la convention en vigueur entre les
        transporteurs sanitaires et l'Assurance Maladie. Lorsque le patient
        bénéficie d'une prise en charge à 100 % (ALD, maternité, CMU-C, CSS)
        et a déclaré une Prescription Médicale de Transport (PMT) valide, la
        course est réglée en Tiers-Payant intégral : le patient n'avance
        aucun frais. En l'absence de prise en charge ou de PMT valide, les
        frais de transport restent à la charge du patient, selon le tarif en
        vigueur.
      </p>

      <h2>Article 4 — Annulation et modification</h2>
      <p>
        Toute annulation effectuée plus de 24 heures avant l'heure de prise
        en charge prévue est gratuite. En deçà de ce délai, des frais
        d'annulation peuvent être appliqués pour compenser l'immobilisation
        du chauffeur. Toute modification de date, d'heure ou d'adresse doit
        être signalée au plus tôt via le service client.
      </p>

      <h2>Article 5 — Exécution de la prestation</h2>
      <p>
        Le chauffeur conventionné s'engage à se présenter à l'heure convenue.
        En cas de retard ou d'imprévu, le patient est informé dans les plus
        brefs délais. Mon Taxi Santé met en œuvre les moyens nécessaires pour
        garantir la ponctualité, sans pouvoir être tenue responsable des cas
        de force majeure (conditions de circulation exceptionnelles,
        intempéries, etc.).
      </p>

      <h2>Article 6 — Responsabilité</h2>
      <p>
        Mon Taxi Santé agit en tant que plateforme de mise en relation entre
        les patients et des chauffeurs conventionnés indépendants. La
        responsabilité civile et le respect des normes sanitaires applicables
        au transport incombent au chauffeur exécutant la prestation, qui
        dispose des assurances et certifications requises.
      </p>

      <h2>Article 7 — Données personnelles</h2>
      <p>
        Le traitement des données personnelles et de santé collectées lors
        de la réservation est décrit dans notre{" "}
        <Link to="/confidentialite">Politique de confidentialité</Link>.
      </p>

      <h2>Article 8 — Droit applicable et litiges</h2>
      <p>
        Les présentes CGV sont soumises au droit français. En cas de litige,
        une solution amiable sera recherchée avant toute action judiciaire,
        notamment par recours à un médiateur de la consommation. À défaut
        d'accord amiable, les tribunaux français seront seuls compétents.
      </p>
    </LegalPageLayout>
  );
}
