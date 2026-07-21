import type { Database } from "~/lib/database.types";

export type BookingStatus = Database["public"]["Tables"]["bookings"]["Row"]["status"];

// Lifecycle order for active (non-terminal-cancelled) bookings.
export const STATUS_ORDER: BookingStatus[] = [
  "pending",
  "confirmed",
  "available",
  "accepted",
  "in_progress",
  "completed",
];

export const STATUS_LABELS: Record<BookingStatus, string> = {
  draft: "Brouillon",
  pending: "Demande envoyée",
  confirmed: "Confirmée",
  available: "Recherche d'un chauffeur",
  accepted: "Chauffeur affecté",
  in_progress: "Trajet en cours",
  completed: "Trajet terminé",
  cancelled: "Annulée",
  expired: "Expirée",
};

export const STATUS_DESCRIPTIONS: Record<BookingStatus, string> = {
  draft: "",
  pending: "Votre demande a été reçue et est en attente de traitement.",
  confirmed: "Votre réservation est confirmée, nous recherchons un chauffeur disponible.",
  available: "Votre course est proposée aux chauffeurs conventionnés du réseau.",
  accepted: "Un chauffeur a accepté votre course.",
  in_progress: "Votre chauffeur est en route ou le trajet est en cours.",
  completed: "Le trajet est terminé. Merci d'avoir utilisé Docteur Taxi.",
  cancelled: "Cette réservation a été annulée.",
  expired: "Aucun chauffeur n'a pu être trouvé avant l'heure prévue. Contactez-nous pour une nouvelle prise en charge.",
};

export const STATUS_BADGE_CLASSES: Record<BookingStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-brand-blue-50 text-brand-blue-700",
  available: "bg-brand-blue-50 text-brand-blue-700",
  accepted: "bg-brand-blue-50 text-brand-blue-700",
  in_progress: "bg-brand-green-50 text-brand-green-700",
  completed: "bg-brand-green-50 text-brand-green-700",
  cancelled: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
};

export function isTerminalStatus(status: BookingStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "expired";
}

const CANCELLABLE_STATUSES: BookingStatus[] = ["pending", "confirmed", "available", "accepted"];

export function isCancellable(status: BookingStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

// Editing is only safe before any driver dispatch has started — bookings now
// leave `pending` for `available` almost immediately (auto-published to the
// driver pool, see migration 019), so the edit window covers both. Past
// `available`, a change is no longer a small correction but a different
// request, so the patient is asked to cancel and rebook instead.
export function isEditable(status: BookingStatus): boolean {
  return status === "pending" || status === "available";
}

// Widened for a real authenticated session (proven by auth.uid(), not just
// reference_code + phone): editing after driver acceptance is safe because
// the app notifies the assigned driver (see notifyBookingUpdatedServerFn).
// update_booking_by_reference deliberately keeps the narrower isEditable
// window — see migration 020.
export function isEditableAuthenticated(status: BookingStatus): boolean {
  return isEditable(status) || status === "accepted";
}

export function getStatusStepState(
  step: BookingStatus,
  currentStatus: BookingStatus
): "done" | "active" | "pending" {
  const stepIndex = STATUS_ORDER.indexOf(step);
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1) return "pending";
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}
