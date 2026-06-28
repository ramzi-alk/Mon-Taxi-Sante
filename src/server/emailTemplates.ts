import { formatDateFr, formatTimeFr, formatReferenceCode } from "~/lib/utils";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_EMAIL } from "~/lib/contact";

interface EmailContent {
  subject: string;
  html: string;
}

// Deliberately minimal: no medical notes, CPAM detail, PMT links, or birth
// date in any email body — those stay in the app behind RLS. Email is not
// an HDS-compliant channel for that data (see migrations 001/009 comments).

function layout(params: { title: string; icon: string; bodyHtml: string }): string {
  const { title, icon, bodyHtml } = params;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;border-collapse:collapse;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0B0F1C;">
      <tr>
        <td style="background:#1244E8;color:#fff;padding:28px 24px;border-radius:14px 14px 0 0;">
          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Mon Taxi Santé</p>
          <h1 style="margin:10px 0 0;font-size:21px;line-height:1.35;">
            <span style="font-size:20px;vertical-align:-2px;">${icon}</span>&nbsp; ${title}
          </h1>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:28px 24px;">
          ${bodyHtml}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #f1f2f6;">
            <tr>
              <td style="padding-top:18px;font-size:13px;color:#6b7280;line-height:1.6;">
                Une question ? Appelez le
                <a href="tel:${CONTACT_PHONE_TEL}" style="color:#1244E8;font-weight:600;text-decoration:none;">${CONTACT_PHONE_DISPLAY}</a>
                ou écrivez à
                <a href="mailto:${CONTACT_EMAIL}" style="color:#1244E8;font-weight:600;text-decoration:none;">${CONTACT_EMAIL}</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

// Links back to the app must only ever carry the public reference code —
// never the phone number, which stays the second factor the patient must
// type in by hand on /mes-reservations. That way a forwarded or leaked
// email link is useless on its own for reading a booking.
function trackingUrl(referenceCode: string): string {
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://mon-taxi-sante.com";
  return `${appUrl}/mes-reservations?ref=${encodeURIComponent(formatReferenceCode(referenceCode))}`;
}

// The day-before reminder token is the sole proof of ownership for
// /confirmer-trajet (no second factor like phone) — single-use, expiring,
// and hashed at rest server-side (see migration 020). The raw token only
// ever exists here, in this one email.
function reminderUrl(token: string): string {
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) ?? "https://mon-taxi-sante.com";
  return `${appUrl}/confirmer-trajet?token=${encodeURIComponent(token)}`;
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="border-radius:10px;background:#1244E8;">
          <a href="${href}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;border-radius:10px;">${label}</a>
        </td>
      </tr>
    </table>
  `;
}

function badge(label: string, color: "green" | "red" | "blue" | "amber"): string {
  const palette = {
    green: { bg: "#ECFDF5", fg: "#059669" },
    red: { bg: "#FEF2F2", fg: "#DC2626" },
    blue: { bg: "#EFF4FF", fg: "#1244E8" },
    amber: { bg: "#FFFBEB", fg: "#D97706" },
  }[color];
  return `<span style="display:inline-block;background:${palette.bg};color:${palette.fg};font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;margin-bottom:16px;">${label}</span>`;
}

function detailsCard(rows: Array<{ label: string; value: string }>): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin:20px 0;overflow:hidden;">
      ${rows
        .map(
          (row, i) => `
        <tr style="${i % 2 === 0 ? "background:#F7F8FC;" : ""}">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;white-space:nowrap;">${row.label}</td>
          <td style="padding:12px 16px;font-size:14px;font-weight:700;text-align:right;">${row.value}</td>
        </tr>
      `
        )
        .join("")}
    </table>
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
    html: layout({
      title: "Réservation confirmée",
      icon: "✅",
      bodyHtml: `
        ${badge("Confirmée", "green")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${patientFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Votre réservation de transport médical a bien été enregistrée. Un chauffeur conventionné Assurance Maladie va prendre en charge votre course.</p>
        ${detailsCard([
          { label: "Référence", value: formatReferenceCode(referenceCode) },
          { label: "Départ", value: pickupAddress },
          { label: "Destination", value: dropoffAddress },
          { label: "Date", value: `${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}` },
        ])}
        ${ctaButton("Suivre ma réservation", trackingUrl(referenceCode))}
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">Ce lien ouvre la page de suivi avec votre référence déjà renseignée. Pour des raisons de sécurité, vous devrez confirmer votre numéro de téléphone pour accéder aux détails.</p>
      `,
    }),
  };
}

export function bookingAcceptedEmail(params: {
  patientFullName: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  driverFullName: string;
  driverPhone: string | null;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleRegistration: string | null;
}): EmailContent {
  const {
    patientFullName,
    referenceCode,
    pickupAddress,
    dropoffAddress,
    pickupDatetime,
    driverFullName,
    driverPhone,
    vehicleBrand,
    vehicleModel,
    vehicleRegistration,
  } = params;
  const vehicleLabel = [vehicleBrand, vehicleModel].filter(Boolean).join(" ");
  return {
    subject: `Chauffeur affecté — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: "Chauffeur affecté",
      icon: "🚗",
      bodyHtml: `
        ${badge("Chauffeur affecté", "blue")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${patientFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Un chauffeur conventionné Assurance Maladie a accepté de prendre en charge votre course.</p>
        ${detailsCard([
          { label: "Référence", value: formatReferenceCode(referenceCode) },
          { label: "Chauffeur", value: driverFullName },
          ...(driverPhone ? [{ label: "Téléphone", value: driverPhone }] : []),
          ...(vehicleLabel ? [{ label: "Véhicule", value: vehicleLabel }] : []),
          ...(vehicleRegistration ? [{ label: "Immatriculation", value: vehicleRegistration }] : []),
          { label: "Départ", value: pickupAddress },
          { label: "Destination", value: dropoffAddress },
          { label: "Date", value: `${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}` },
        ])}
        ${ctaButton("Suivre ma réservation", trackingUrl(referenceCode))}
      `,
    }),
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
    html: layout({
      title: "Réservation annulée",
      icon: "🚫",
      bodyHtml: `
        ${badge("Annulée", "red")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${patientFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Votre réservation prévue le <strong>${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}</strong> (réf. ${formatReferenceCode(referenceCode)}) a bien été annulée.</p>
        ${
          cancellationReason
            ? `<div style="background:#F7F8FC;border-radius:10px;padding:12px 16px;margin:0 0 16px;font-size:14px;color:#374151;"><strong style="color:#6b7280;font-weight:600;">Motif indiqué :</strong> ${cancellationReason}</div>`
            : ""
        }
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">Vous pouvez créer une nouvelle réservation à tout moment depuis notre site.</p>
      `,
    }),
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
  const rows = [
    { label: "Nom", value: driverFullName },
    { label: "Email", value: driverEmail },
    ...(driverPhone ? [{ label: "Téléphone", value: driverPhone }] : []),
    { label: "Véhicule", value: `${vehicleType} — ${vehicleRegistration}` },
    { label: "SIRET", value: `${siret}${companyName ? ` (${companyName})` : ""}` },
  ];
  return {
    subject: `Nouvelle candidature chauffeur — ${driverFullName}`,
    html: layout({
      title: "Nouvelle candidature chauffeur",
      icon: "🔔",
      bodyHtml: `
        ${badge("En attente de validation", "blue")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Une nouvelle candidature chauffeur vient d'être soumise et attend votre validation.</p>
        ${detailsCard(rows)}
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">Connectez-vous au tableau de bord administrateur pour examiner le dossier et l'approuver.</p>
      `,
    }),
  };
}

export function driverApprovedEmail(params: { driverFullName: string }): EmailContent {
  const { driverFullName } = params;
  return {
    subject: "Votre candidature a été approuvée — Mon Taxi Santé",
    html: layout({
      title: "Candidature approuvée",
      icon: "🎉",
      bodyHtml: `
        ${badge("Compte activé", "green")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${driverFullName},</p>
        <p style="margin:0;font-size:15px;line-height:1.5;">Bonne nouvelle : votre candidature chauffeur a été validée par notre équipe. Vous pouvez désormais accéder à votre tableau de bord et accepter des courses disponibles dans la file d'attente.</p>
      `,
    }),
  };
}

export function bookingReminderEmail(params: {
  patientFullName: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  token: string;
}): EmailContent {
  const { patientFullName, referenceCode, pickupAddress, dropoffAddress, pickupDatetime, token } = params;
  return {
    subject: `Rappel — votre course de demain (Réf. ${formatReferenceCode(referenceCode)})`,
    html: layout({
      title: "Votre course est demain",
      icon: "📅",
      bodyHtml: `
        ${badge("Confirmation requise", "blue")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${patientFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Pour rappel, vous avez une course prévue demain. Merci de confirmer ou d'annuler ce trajet ci-dessous.</p>
        ${detailsCard([
          { label: "Référence", value: formatReferenceCode(referenceCode) },
          { label: "Départ", value: pickupAddress },
          { label: "Destination", value: dropoffAddress },
          { label: "Date", value: `${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}` },
        ])}
        ${ctaButton("Confirmer ou annuler ce trajet", reminderUrl(token))}
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">Ce lien est à usage unique et n'est valable que jusqu'au jour de votre course.</p>
      `,
    }),
  };
}

export function bookingUpdatedDriverEmail(params: {
  driverFullName: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
}): EmailContent {
  const { driverFullName, referenceCode, pickupAddress, dropoffAddress, pickupDatetime } = params;
  return {
    subject: `Détails modifiés — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: "Détails de la course modifiés",
      icon: "✏️",
      bodyHtml: `
        ${badge("Mise à jour", "blue")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${driverFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Le patient a modifié les détails d'une course que vous avez acceptée.</p>
        ${detailsCard([
          { label: "Référence", value: formatReferenceCode(referenceCode) },
          { label: "Départ", value: pickupAddress },
          { label: "Destination", value: dropoffAddress },
          { label: "Nouvelle date", value: `${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}` },
        ])}
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">Consultez votre tableau de bord chauffeur pour voir le détail complet de la course.</p>
      `,
    }),
  };
}

export function rideUnassignedByDriverEmail(params: {
  patientFullName: string;
  referenceCode: string;
  pickupDatetime: string;
}): EmailContent {
  const { patientFullName, referenceCode, pickupDatetime } = params;
  return {
    subject: `Recherche d'un nouveau chauffeur — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: "Recherche d'un nouveau chauffeur",
      icon: "🔄",
      bodyHtml: `
        ${badge("Nouvelle recherche en cours", "amber")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${patientFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Le chauffeur initialement affecté à votre course du <strong>${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}</strong> (réf. ${formatReferenceCode(referenceCode)}) n'est finalement plus disponible. Votre réservation est de nouveau proposée à notre réseau de chauffeurs conventionnés ; vous serez averti dès qu'un nouveau chauffeur l'accepte.</p>
        ${ctaButton("Suivre ma réservation", trackingUrl(referenceCode))}
      `,
    }),
  };
}

export function bookingCancelledDriverEmail(params: {
  driverFullName: string;
  referenceCode: string;
  pickupDatetime: string;
}): EmailContent {
  const { driverFullName, referenceCode, pickupDatetime } = params;
  return {
    subject: `Course annulée par le patient — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: "Course annulée",
      icon: "🚫",
      bodyHtml: `
        ${badge("Annulée", "red")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${driverFullName},</p>
        <p style="margin:0;font-size:15px;line-height:1.5;">Le patient a annulé la course prévue le <strong>${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}</strong> (réf. ${formatReferenceCode(referenceCode)}) que vous aviez acceptée. Elle n'apparaîtra plus dans votre tableau de bord.</p>
      `,
    }),
  };
}
