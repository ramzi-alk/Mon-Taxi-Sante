import { formatDateFr, formatTimeFr, formatReferenceCode } from "~/lib/utils";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_EMAIL } from "~/lib/contact";

interface EmailContent {
  subject: string;
  html: string;
}

// Deliberately minimal: no medical notes, CPAM detail, PMT links, or birth
// date in any email body — those stay in the app behind RLS. Email is not
// an HDS-compliant channel for that data (see migrations 001/009 comments).

function layout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0B0F1C;">
      <div style="background: #1244E8; color: #fff; padding: 24px; border-radius: 12px 12px 0 0;">
        <p style="margin: 0; font-size: 13px; opacity: 0.85;">Mon Taxi Santé</p>
        <h1 style="margin: 4px 0 0; font-size: 20px;">${title}</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
        ${bodyHtml}
        <p style="margin-top: 28px; font-size: 13px; color: #6b7280;">
          Une question ? Appelez le
          <a href="tel:${CONTACT_PHONE_TEL}" style="color: #1244E8; font-weight: 600;">${CONTACT_PHONE_DISPLAY}</a>
          ou écrivez à
          <a href="mailto:${CONTACT_EMAIL}" style="color: #1244E8; font-weight: 600;">${CONTACT_EMAIL}</a>.
        </p>
      </div>
    </div>
  `;
}

export function bookingConfirmationEmail(params: {
  patientFullName: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
}): EmailContent {
  const { patientFullName, referenceCode, pickupAddress, dropoffAddress, pickupDatetime } = params;
  return {
    subject: `Réservation confirmée — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout(
      "Réservation confirmée",
      `
        <p>Bonjour ${patientFullName},</p>
        <p>Votre réservation de transport médical a bien été enregistrée. Un chauffeur conventionné Assurance Maladie va prendre en charge votre course.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Référence</td><td style="padding: 6px 0; font-weight: 600;">${formatReferenceCode(referenceCode)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Départ</td><td style="padding: 6px 0; font-weight: 600;">${pickupAddress}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Destination</td><td style="padding: 6px 0; font-weight: 600;">${dropoffAddress}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Date</td><td style="padding: 6px 0; font-weight: 600;">${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}</td></tr>
        </table>
        <p>Vous pouvez suivre l'avancement de votre réservation à tout moment sur la page "Mes réservations".</p>
      `
    ),
  };
}

export function bookingCancellationEmail(params: {
  patientFullName: string;
  referenceCode: string;
  pickupDatetime: string;
  cancellationReason: string | null;
}): EmailContent {
  const { patientFullName, referenceCode, pickupDatetime, cancellationReason } = params;
  return {
    subject: `Réservation annulée — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout(
      "Réservation annulée",
      `
        <p>Bonjour ${patientFullName},</p>
        <p>Votre réservation prévue le ${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)} (réf. ${formatReferenceCode(referenceCode)}) a bien été annulée.</p>
        ${cancellationReason ? `<p style="color: #6b7280; font-size: 14px;">Motif indiqué : ${cancellationReason}</p>` : ""}
        <p>Vous pouvez créer une nouvelle réservation à tout moment depuis notre site.</p>
      `
    ),
  };
}

export function adminNewDriverApplicationEmail(params: {
  driverFullName: string;
  driverEmail: string;
  driverPhone: string | null;
  vehicleType: string;
  vehicleRegistration: string;
  siret: string;
  companyName: string | null;
}): EmailContent {
  const { driverFullName, driverEmail, driverPhone, vehicleType, vehicleRegistration, siret, companyName } = params;
  return {
    subject: `Nouvelle candidature chauffeur — ${driverFullName}`,
    html: layout(
      "Nouvelle candidature chauffeur",
      `
        <p>Une nouvelle candidature chauffeur vient d'être soumise et attend votre validation.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Nom</td><td style="padding: 6px 0; font-weight: 600;">${driverFullName}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0; font-weight: 600;">${driverEmail}</td></tr>
          ${driverPhone ? `<tr><td style="padding: 6px 0; color: #6b7280;">Téléphone</td><td style="padding: 6px 0; font-weight: 600;">${driverPhone}</td></tr>` : ""}
          <tr><td style="padding: 6px 0; color: #6b7280;">Véhicule</td><td style="padding: 6px 0; font-weight: 600;">${vehicleType} — ${vehicleRegistration}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">SIRET</td><td style="padding: 6px 0; font-weight: 600;">${siret}${companyName ? ` (${companyName})` : ""}</td></tr>
        </table>
        <p>Connectez-vous au tableau de bord administrateur pour examiner le dossier et l'approuver.</p>
      `
    ),
  };
}

export function driverApprovedEmail(params: { driverFullName: string }): EmailContent {
  const { driverFullName } = params;
  return {
    subject: "Votre candidature a été approuvée — Mon Taxi Santé",
    html: layout(
      "Candidature approuvée",
      `
        <p>Bonjour ${driverFullName},</p>
        <p>Bonne nouvelle : votre candidature chauffeur a été validée par notre équipe. Vous pouvez désormais accéder à votre tableau de bord et accepter des courses disponibles dans la file d'attente.</p>
      `
    ),
  };
}
