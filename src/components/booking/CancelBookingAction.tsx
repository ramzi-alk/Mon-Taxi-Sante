import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { XCircle, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { supabase } from "~/lib/supabase";
import { useToast } from "~/components/ui/toast";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { LookupCredentials } from "~/repositories/bookingsRepository";
import { notifyBookingCancelledServerFn, notifyDriverPatientCancelledServerFn } from "~/server/email";
import { logger } from "~/lib/logger";

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
    mutationFn: () =>
      lookupCredentials
        ? bookingsRepository.cancelBookingByReference(
            supabase,
            lookupCredentials.referenceCode,
            lookupCredentials.phone
          )
        : bookingsRepository.cancelBooking(supabase, bookingId),
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
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-700">Confirmer l&apos;annulation ?</span>
        <button
          type="button"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
          className="font-bold text-red-600 hover:underline disabled:opacity-60 flex items-center gap-1.5"
        >
          {cancelMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Oui, annuler
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={cancelMutation.isPending}
          className="text-gray-500 hover:underline"
        >
          Non
        </button>
      </div>
    </div>
  );
}
