import { formatDateFr, formatTimeFr } from "~/lib/utils";
import type { PoolRide } from "~/components/driver/RideCard";

// Justificatif de transport basique (trajet, horaires réels de prise en
// charge/dépose, référence course) — pour éviter la double saisie papier
// que beaucoup de chauffeurs VSL/taxi conventionné font encore pour monter
// leur dossier de facturation CPAM. Généré côté client (jsPDF), aucune
// donnée n'est envoyée à un serveur pour ça. jsPDF (~350 kB) est chargée à
// la demande (import dynamique) plutôt que statiquement, pour ne pas
// alourdir le bundle du dashboard chauffeur pour tout le monde.
export async function generateReceiptPdf(ride: PoolRide): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 20;
  let y = 25;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Justificatif de transport", marginX, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text("Docteur Taxi — transport sanitaire conventionné", marginX, y);
  doc.setTextColor(0);
  y += 12;

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, marginX + 55, y);
    y += 7;
  };

  doc.setDrawColor(220);
  doc.line(marginX, y, 190, y);
  y += 8;

  row("Référence course", ride.reference_code ?? ride.id.slice(0, 8).toUpperCase());
  row("Patient", ride.patient_full_name ?? ride.patient_first_name);
  row("Véhicule", ride.vehicle_type.toUpperCase());
  y += 4;

  doc.line(marginX, y, 190, y);
  y += 8;

  row("Départ", ride.pickup_address);
  row("Destination", ride.dropoff_address);
  if (ride.distance_km != null) row("Distance", `${ride.distance_km} km`);
  y += 4;

  doc.line(marginX, y, 190, y);
  y += 8;

  row("Prise en charge prévue", `${formatDateFr(ride.pickup_datetime)} à ${formatTimeFr(ride.pickup_datetime)}`);
  if (ride.picked_up_at) {
    row("Prise en charge réelle", `${formatDateFr(ride.picked_up_at)} à ${formatTimeFr(ride.picked_up_at)}`);
  }
  if (ride.completed_at) {
    row("Fin de course", `${formatDateFr(ride.completed_at)} à ${formatTimeFr(ride.completed_at)}`);
  }
  y += 4;

  const price = ride.actual_price ?? ride.estimated_price;
  if (price != null) {
    doc.line(marginX, y, 190, y);
    y += 8;
    row("Tarif" + (ride.actual_price == null ? " (estimé)" : ""), `${price.toFixed(2).replace(".", ",")} €`);
    y += 4;
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "Document généré automatiquement depuis le tableau de bord chauffeur Docteur Taxi — ne remplace pas une facture.",
    marginX,
    280
  );

  doc.save(`justificatif-${ride.reference_code ?? ride.id.slice(0, 8)}.pdf`);
}
