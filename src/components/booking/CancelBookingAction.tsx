import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import { supabase } from "~/lib/supabase";
import { useToast } from "~/components/ui/toast";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { LookupCredentials } from "~/repositories/bookingsRepository";
import { notifyBookingCancelledServerFn, notifyDriverPatientCancelledServerFn } from "~/server/email";
import { logger } from "~/lib/logger";
import { CancelReasonForm, type CancelReasonPreset } from "~/components/CancelReasonForm";

// Reformulations neutres, sans jugement sur le patient — l'objectif est de
// comprendre pourquoi une réservation confirmée est annulée (voir enquête
// Resend : ~50% des réservations récentes finissent annulées, sans motif
// exploitable jusqu'ici puisque cancelBooking() n'en recevait jamais aucun).
const PATIENT_CANCEL_REASON_PRESETS: readonly CancelReasonPreset[] = [
  { value: "autre_moyen_transport", label: "J'ai trouvé un autre moyen de transport" },
  { value: "rdv_annule_reporte", label: "Mon rendez-vous médical a été annulé ou reporté" },
  { value: "erreur_reservation", label: "Je me suis trompé(e) en réservant (date, adresse, horaire…)" },
  { value: "plus_besoin", label: "Je n'ai plus besoin de ce trajet" },
  { value: "autre", label: "Autre" },
];

interface CancelBookingActionProps {
  bookingId: string;
  pickupDatetime: string;
  /** When set, cancellation proves ownership via reference_code + phone instead of the live auth.uid() session. */
  lookupCredentials?: LookupCredentials;
  /** Called once the cancellation has succeeded, so the parent can reflect the new status. */
  onCancelled: () => void;
}

/**
 * Self-contained cancellation flow, extracted from BookingStatusCard so that
 * a consumer only wanting to display a booking (PatientEmailLogin's
 * read-only history, for instance) doesn't have to pull in the
 * confirm-then-cancel state machine and its two mutations/notifications.
 */
export function CancelBookingAction({
  bookingId,
  pickupDatetime,
  lookupCredentials,
  onCancelled,
}: CancelBookingActionProps) {
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      lookupCredentials
        ? bookingsRepository.cancelBookingByReference(
            supabase,
            lookupCredentials.referenceCode,
            lookupCredentials.phone,
            reason
          )
        : bookingsRepository.cancelBooking(supabase, bookingId, reason),
    onSuccess: () => {
      setConfirming(false);
      toast({ title: "Réservation annulée", variant: "success" });
      onCancelled();
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      notifyBookingCancelledServerFn({ data: { bookingId } }).catch((err) => {
        logger.error("email.notifyBookingCancelled call failed", {
          error: err instanceof Error ? err.message : String(err),
          bookingId,
        });
      });
      // Notify the assigned driver (if any) that the patient has cancelled.
      notifyDriverPatientCancelledServerFn({ data: { bookingId } }).catch((err) => {
        logger.error("email.notifyDriverPatientCancelled call failed", {
          error: err instanceof Error ? err.message : String(err),
          bookingId,
        });
      });
    },
    onError: (err: Error) => {
      setConfirming(false);
      logger.error("booking.cancel failed", { error: err.message, bookingId });
      toast({ title: "Impossible d'annuler", description: err.message, variant: "error" });
    },
  });

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        <XCircle className="h-4 w-4" aria-hidden="true" />
        Annuler cette réservation
      </button>
    );
  }

  const hoursUntilPickup = (new Date(pickupDatetime).getTime() - Date.now()) / 3_600_000;
  const withinFreeCancelWindow = hoursUntilPickup >= 24;

  return (
    <div className="space-y-2.5">
      <p
        className={cn(
          "text-sm rounded-lg px-3 py-2",
          withinFreeCancelWindow
            ? "bg-brand-green-50 text-brand-green-800"
            : "bg-amber-50 text-amber-800"
        )}
      >
        {withinFreeCancelWindow
          ? "Vous êtes dans le délai d'annulation gratuite (plus de 24h avant le départ)."
          : "Ce départ est prévu dans moins de 24h — merci de nous prévenir au plus vite pour laisser une chance à un autre patient d'utiliser ce créneau."}
      </p>
      <CancelReasonForm
        presets={PATIENT_CANCEL_REASON_PRESETS}
        isSubmitting={cancelMutation.isPending}
        confirmLabel="Oui, annuler"
        onConfirm={(reason) => cancelMutation.mutate(reason)}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
