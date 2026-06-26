import type { MyBookingRow } from "~/repositories/bookingsRepository";
import { formatDateFr, formatTimeFr, formatPrice, formatReferenceCode } from "~/lib/utils";
import { CPAM_LABELS } from "~/lib/cpam";
import { VEHICLE_LABELS } from "~/lib/vehicle";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Opens a print-ready justificatif de transport for a completed booking in
 * a new tab. There is no PDF generation backend — this relies on the
 * browser's native "print to PDF" option, which covers the same need
 * (a downloadable, archivable receipt) without adding a PDF dependency.
 */
export function openBookingReceipt(booking: MyBookingRow): void {
  const win = window.open("", "_blank");
  if (!win) return;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Justificatif — ${escapeHtml(formatReferenceCode(booking.reference_code))}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0B0F1C; max-width: 640px; margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .ref { color: #1244E8; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 10px 0; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  td:first-child { color: #6B7280; width: 200px; font-size: 13px; }
  .footer { margin-top: 32px; font-size: 12px; color: #6B7280; }
  @media print { body { margin: 0; padding: 16px; } }
</style>
</head>
<body>
  <h1>Justificatif de transport</h1>
  <p class="ref">Référence ${escapeHtml(formatReferenceCode(booking.reference_code))}</p>
  <table>
    <tr><td>Patient</td><td>${escapeHtml(booking.patient_full_name)}</td></tr>
    <tr><td>Trajet</td><td>${escapeHtml(booking.pickup_address)} → ${escapeHtml(booking.dropoff_address)}</td></tr>
    <tr><td>Date</td><td>${escapeHtml(formatDateFr(booking.pickup_datetime))} à ${escapeHtml(formatTimeFr(booking.pickup_datetime))}</td></tr>
    <tr><td>Véhicule</td><td>${escapeHtml(VEHICLE_LABELS[booking.vehicle_type] ?? booking.vehicle_type)}</td></tr>
    <tr><td>Prise en charge</td><td>${escapeHtml(CPAM_LABELS[booking.cpam_status] ?? booking.cpam_status)}</td></tr>
    ${booking.estimated_price ? `<tr><td>Montant</td><td>${escapeHtml(formatPrice(booking.estimated_price))}</td></tr>` : ""}
    <tr><td>Statut</td><td>Trajet terminé</td></tr>
  </table>
  <p class="footer">Mon Taxi Santé — document généré le ${escapeHtml(new Date().toLocaleDateString("fr-FR"))}, à des fins de justification auprès de votre caisse d'assurance maladie.</p>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}
