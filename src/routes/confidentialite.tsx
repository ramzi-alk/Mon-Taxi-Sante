import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPageLayout } from "~/components/LegalPageLayout";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Confidentialité & RGPD — Mon Taxi Santé" },
      {
        name: "description",
        content:
          "Politique de confidentialité de Mon Taxi Santé : données collectées, hébergement HDS, durée de conservation et vos droits RGPD.",
      },
    ],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <LegalPageLayout
      title="Confidentialité & protection des données"
      lastUpdated="25 juin 2026"
    >
      <h2>Responsable du traitement</h2>
      <p>
        Mon Taxi Santé SAS est responsable du traitement des données
        collectées via le site mon-taxi-sante.fr. Pour toute question,
        contactez notre Délégué à la Protection des Données à l'adresse{" "}
        <a href="mailto:dpo@mon-taxi-sante.fr">dpo@mon-taxi-sante.fr</a>.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Données d'identification : nom, prénom, téléphone, email</li>
        <li>
          Données de réservation : adresses de départ et d'arrivée, date et
          heure du transport, type de véhicule
        </li>
        <li>
          Données de santé : statut de prise en charge (ALD, CMU-C, CSS),
          besoins spécifiques (fauteuil roulant, brancard, oxygène) —
          catégorie particulière de données au sens de l'article 9 du RGPD
        </li>
        <li>
          Documents justificatifs : prescription médicale de transport (PMT)
        </li>
      </ul>

      <h2>Finalités du traitement</h2>
      <ul>
        <li>Gestion des réservations et mise en relation avec un chauffeur conventionné</li>
        <li>Facturation et transmission en Tiers-Payant à l'Assurance Maladie</li>
        <li>Communication relative à la course (confirmation par SMS et email, suivi)</li>
        <li>Amélioration du service et statistiques anonymisées</li>
      </ul>

      <h2>Base légale</h2>
      <ul>
        <li>Exécution du contrat de transport lors de la réservation</li>
        <li>Consentement explicite pour le traitement des données de santé (art. 9.2.a du RGPD)</li>
        <li>Obligation légale pour la facturation et la comptabilité</li>
      </ul>

      <h2>Hébergement et sécurité (HDS)</h2>
      <p>
        Vos données de santé sont hébergées chez un prestataire certifié
        Hébergeur de Données de Santé (HDS), chiffrées au repos et en
        transit. L'accès à ces données est strictement limité aux
        personnes habilitées dans le cadre de la prestation de transport.
      </p>

      <h2>Durée de conservation</h2>
      <ul>
        <li>Données de réservation : 5 ans, à des fins comptables et de preuve</li>
        <li>
          Documents médicaux (PMT) : durée nécessaire à la prise en charge
          Assurance Maladie, puis suppression sécurisée
        </li>
        <li>Données de compte chauffeur partenaire : durée du partenariat, augmentée des délais légaux</li>
      </ul>

      <h2>Vos droits</h2>
      <p>
        Conformément au RGPD et à la loi Informatique et Libertés, vous
        disposez d'un droit d'accès, de rectification, d'effacement, de
        limitation, d'opposition et de portabilité de vos données, ainsi que
        du droit de retirer votre consentement à tout moment. Pour exercer
        ces droits, écrivez-nous à{" "}
        <a href="mailto:dpo@mon-taxi-sante.fr">dpo@mon-taxi-sante.fr</a>. Vous
        pouvez également introduire une réclamation auprès de la CNIL
        (cnil.fr).
      </p>

      <h2>Cookies</h2>
      <p>
        Le site utilise des cookies strictement nécessaires au fonctionnement
        du parcours de réservation, ainsi que des cookies de mesure
        d'audience. Aucun cookie publicitaire n'est déposé sans votre
        consentement préalable.
      </p>

      <h2>Sous-traitants</h2>
      <p>
        Dans le cadre de la prestation, certaines données peuvent être
        transmises à nos sous-traitants : hébergeur HDS, base de données
        sécurisée (Supabase), prestataire d'envoi de SMS/email, et
        l'Assurance Maladie pour la transmission du Tiers-Payant.
      </p>

      <p>
        Pour en savoir plus sur les conditions de réservation, consultez nos{" "}
        <Link to="/cgv">Conditions Générales de Vente</Link>.
      </p>
    </LegalPageLayout>
  );
}
