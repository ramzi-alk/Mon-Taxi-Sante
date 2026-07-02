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
  // Present when the booking was placed by someone other than the patient
  bookerFullName?: string;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  // Présents uniquement pour une série de soins (trip_type = multiple, PMT
  // déclarée) : une seule confirmation résume toutes les séances plutôt que
  // d'envoyer un email par réservation générée.
  seriesTotal?: number;
  seriesLastPickupDatetime?: string;
}): EmailContent {
  const {
    patientFullName,
    bookerFullName,
    referenceCode,
    pickupAddress,
    dropoffAddress,
    pickupDatetime,
    seriesTotal,
    seriesLastPickupDatetime,
  } = params;
  const isSeries = !!seriesTotal && seriesTotal > 1 && !!seriesLastPickupDatetime;
  const isThirdParty = !!bookerFullName;
  const dateValue = isSeries
    ? `${seriesTotal} séances, du ${formatDateFr(pickupDatetime)} au ${formatDateFr(seriesLastPickupDatetime!)}`
    : `${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}`;
  const greeting = isThirdParty
    ? `Bonjour ${bookerFullName},`
    : `Bonjour ${patientFullName},`;
  const intro = isThirdParty
    ? isSeries
      ? `Vous avez réservé une série de ${seriesTotal} séances de transport médical pour <strong>${patientFullName}</strong>. Un chauffeur conventionné Assurance Maladie sera affecté à chaque séance.`
      : `Vous avez réservé un transport médical pour <strong>${patientFullName}</strong>. Un chauffeur conventionné Assurance Maladie va prendre en charge la course.`
    : isSeries
    ? `Votre série de ${seriesTotal} séances de transport médical a bien été enregistrée. Un chauffeur conventionné Assurance Maladie sera affecté à chaque séance.`
    : `Votre réservation de transport médical a bien été enregistrée. Un chauffeur conventionné Assurance Maladie va prendre en charge votre course.`;
  return {
    subject: isSeries
      ? `Série de ${seriesTotal} séances confirmée — Réf. ${formatReferenceCode(referenceCode)}`
      : `Réservation confirmée — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: isSeries ? "Série de soins confirmée" : "Réservation confirmée",
      icon: "✅",
      bodyHtml: `
        ${badge("Confirmée", "green")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${greeting}</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${intro}</p>
        ${detailsCard([
          { label: "Référence", value: formatReferenceCode(referenceCode) },
          ...(isThirdParty ? [{ label: "Patient", value: patientFullName }] : []),
          { label: "Départ", value: pickupAddress },
          { label: "Destination", value: dropoffAddress },
          { label: isSeries ? "Dates" : "Date", value: dateValue },
        ])}
        ${ctaButton("Suivre la réservation", trackingUrl(referenceCode))}
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">Ce lien ouvre la page de suivi avec la référence déjà renseignée. Pour des raisons de sécurité, le numéro de téléphone du patient sera demandé pour accéder aux détails.</p>
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
  driverAverageRating?: number | null;
  seriesTotal?: number;
  seriesLastPickupDatetime?: string;
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
    driverAverageRating,
    seriesTotal,
    seriesLastPickupDatetime,
  } = params;
  const isSeries = !!seriesTotal && seriesTotal > 1 && !!seriesLastPickupDatetime;
  const vehicleLabel = [vehicleBrand, vehicleModel].filter(Boolean).join(" ");
  const dateValue = isSeries
    ? `${seriesTotal} séances, du ${formatDateFr(pickupDatetime)} au ${formatDateFr(seriesLastPickupDatetime!)}`
    : `${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}`;
  const intro = isSeries
    ? `Un chauffeur conventionné Assurance Maladie a accepté de prendre en charge l'ensemble de vos <strong>${seriesTotal} séances</strong> de transport.`
    : `Un chauffeur conventionné Assurance Maladie a accepté de prendre en charge votre course.`;
  return {
    subject: isSeries
      ? `Chauffeur affecté pour ${seriesTotal} séances — Réf. ${formatReferenceCode(referenceCode)}`
      : `Chauffeur affecté — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: isSeries ? `Chauffeur affecté — ${seriesTotal} séances` : "Chauffeur affecté",
      icon: "🚗",
      bodyHtml: `
        ${badge("Chauffeur affecté", "blue")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${patientFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${intro}</p>
        ${detailsCard([
          { label: "Référence", value: formatReferenceCode(referenceCode) },
          { label: "Chauffeur", value: driverFullName },
          ...(driverAverageRating != null ? [{ label: "Note moyenne", value: `⭐ ${driverAverageRating.toFixed(1)} / 5` }] : []),
          ...(vehicleLabel ? [{ label: "Véhicule", value: vehicleLabel }] : []),
          ...(vehicleRegistration ? [{ label: "Immatriculation", value: vehicleRegistration }] : []),
          { label: "Départ", value: pickupAddress },
          { label: "Destination", value: dropoffAddress },
          { label: isSeries ? "Dates" : "Date", value: dateValue },
        ])}
        ${driverPhone ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          <tr>
            <td style="background:#EFF4FF;border:1px solid #c7d7fd;border-radius:12px;padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#4361c2;">Contacter votre chauffeur</p>
              <a href="tel:${driverPhone}" style="font-size:22px;font-weight:800;color:#1244E8;text-decoration:none;letter-spacing:0.02em;">${driverPhone}</a>
              <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">Appuyez sur ce numéro depuis votre téléphone pour appeler directement.</p>
            </td>
          </tr>
        </table>
        ` : ""}
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

export function driverRejectedEmail(params: { driverFullName: string; reason: string }): EmailContent {
  const { driverFullName, reason } = params;
  return {
    subject: "Votre candidature chauffeur — Mon Taxi Santé",
    html: layout({
      title: "Candidature non retenue",
      icon: "📋",
      bodyHtml: `
        ${badge("Candidature non retenue", "amber")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${driverFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Après examen de votre dossier, nous ne sommes pas en mesure de valider votre candidature chauffeur pour le moment, pour la raison suivante :</p>
        ${detailsCard([{ label: "Motif", value: reason }])}
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">Vous pouvez soumettre une nouvelle candidature une fois ce point corrigé. Pour toute question, contactez-nous directement.</p>
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
  seriesTotal?: number;
  seriesLastPickupDatetime?: string;
}): EmailContent {
  const { patientFullName, referenceCode, pickupDatetime, seriesTotal, seriesLastPickupDatetime } = params;
  const isSeries = !!seriesTotal && seriesTotal > 1 && !!seriesLastPickupDatetime;
  const body = isSeries
    ? `Le chauffeur affecté à votre série de <strong>${seriesTotal} séances</strong> (du ${formatDateFr(pickupDatetime)} au ${formatDateFr(seriesLastPickupDatetime!)}, réf. ${formatReferenceCode(referenceCode)}) n'est finalement plus disponible. Toutes les séances sont de nouveau proposées à notre réseau de chauffeurs conventionnés ; vous serez averti dès qu'un nouveau chauffeur les accepte.`
    : `Le chauffeur initialement affecté à votre course du <strong>${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}</strong> (réf. ${formatReferenceCode(referenceCode)}) n'est finalement plus disponible. Votre réservation est de nouveau proposée à notre réseau de chauffeurs conventionnés ; vous serez averti dès qu'un nouveau chauffeur l'accepte.`;
  return {
    subject: isSeries
      ? `Recherche d'un nouveau chauffeur pour ${seriesTotal} séances — Réf. ${formatReferenceCode(referenceCode)}`
      : `Recherche d'un nouveau chauffeur — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: "Recherche d'un nouveau chauffeur",
      icon: "🔄",
      bodyHtml: `
        ${badge("Nouvelle recherche en cours", "amber")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${patientFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${body}</p>
        ${ctaButton("Suivre ma réservation", trackingUrl(referenceCode))}
      `,
    }),
  };
}

export function rideAcceptedDriverEmail(params: {
  driverFullName: string;
  patientFullName: string;
  patientPhone: string | null;
  /** When true, phone is intentionally withheld until closer to pickup; show a gate message instead of "non renseigné". */
  patientPhoneMasked?: boolean;
  referenceCode: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDatetime: string;
  seriesTotal?: number;
  seriesLastPickupDatetime?: string;
}): EmailContent {
  const {
    driverFullName,
    patientFullName,
    patientPhone,
    patientPhoneMasked,
    referenceCode,
    pickupAddress,
    dropoffAddress,
    pickupDatetime,
    seriesTotal,
    seriesLastPickupDatetime,
  } = params;
  const isSeries = !!seriesTotal && seriesTotal > 1 && !!seriesLastPickupDatetime;
  const dateValue = isSeries
    ? `${seriesTotal} séances, du ${formatDateFr(pickupDatetime)} au ${formatDateFr(seriesLastPickupDatetime!)}`
    : `${formatDateFr(pickupDatetime)} à ${formatTimeFr(pickupDatetime)}`;
  const intro = isSeries
    ? `Vous venez d'accepter <strong>${seriesTotal} séances</strong> pour ce patient. Retrouvez ci-dessous les informations de la course.`
    : `Vous venez d'accepter cette course. Retrouvez ci-dessous les informations de la prise en charge.`;

  let phoneHtml: string;
  if (patientPhone) {
    phoneHtml = `<a href="tel:${patientPhone}" style="font-size:22px;font-weight:800;color:#16a34a;text-decoration:none;letter-spacing:0.02em;">${patientPhone}</a>
                 <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">Appuyez sur ce numéro depuis votre téléphone pour appeler directement.</p>`;
  } else if (patientPhoneMasked) {
    phoneHtml = `<p style="margin:0;font-size:14px;color:#b45309;font-style:italic;">📵 Numéro disponible dans votre tableau de bord à l'approche de la course.</p>`;
  } else {
    phoneHtml = `<p style="margin:0;font-size:14px;color:#6b7280;font-style:italic;">Numéro de téléphone non renseigné pour cette réservation.</p>`;
  }

  return {
    subject: isSeries
      ? `${seriesTotal} séances acceptées — ${patientFullName} — Réf. ${formatReferenceCode(referenceCode)}`
      : `Course acceptée — ${patientFullName} — Réf. ${formatReferenceCode(referenceCode)}`,
    html: layout({
      title: isSeries ? `${seriesTotal} séances acceptées` : "Course acceptée",
      icon: "✅",
      bodyHtml: `
        ${badge(isSeries ? `${seriesTotal} séances acceptées` : "Course acceptée", "green")}
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">Bonjour ${driverFullName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${intro}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
          <tr>
            <td style="background:#F0FDF4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#16a34a;">Coordonnées du patient</p>
              <p style="margin:0 0 8px;font-size:17px;font-weight:800;color:#14532d;">${patientFullName}</p>
              ${phoneHtml}
            </td>
          </tr>
        </table>
        ${detailsCard([
          { label: "Référence", value: formatReferenceCode(referenceCode) },
          { label: "Départ", value: pickupAddress },
          { label: "Destination", value: dropoffAddress },
          { label: isSeries ? "Dates" : "Date", value: dateValue },
        ])}
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">Consultez votre tableau de bord pour démarrer la course le moment venu.</p>
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
