import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Calendar, Car, XCircle, User, Phone, Download, Loader2 } from "lucide-react";
import { formatDateFr, formatTimeFr, formatPrice, formatReferenceCode, cn } from "~/lib/utils";
import { VEHICLE_LABELS } from "~/lib/vehicle";
import { openBookingReceipt } from "~/lib/receipt";
import { supabase } from "~/lib/supabase";
import { useToast } from "~/components/ui/toast";
import {
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_DESCRIPTIONS,
  STATUS_BADGE_CLASSES,
  getStatusStepState,
  isCancellable,
  type BookingStatus,
} from "~/lib/bookingStatus";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { MyBookingRow } from "~/repositories/bookingsRepository";

interface BookingStatusCardProps {
  booking: MyBookingRow;
  /** Only the live session ("Mes réservations") may cancel; the lost-session recovery flow is read-only. */
  allowCancel?: boolean;
}

export function BookingStatusCard({ booking, allowCancel = false }: BookingStatusCardProps) {
  const status = booking.status as BookingStatus;
  const isCancelled = status === "cancelled";
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => bookingsRepository.cancelBooking(supabase, booking.id),
    onSuccess: () => {
      setConfirmingCancel(false);
      toast({ title: "Réservation annulée", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (err: Error) => {
      setConfirmingCancel(false);
      toast({ title: "Impossible d'annuler", description: err.message, variant: "error" });
    },
  });

  const hasDriver = !!booking.driver_full_name;

  return (
    <article
      className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden"
      aria-label={`Réservation du ${formatDateFr(booking.pickup_datetime)}`}
    >
      <div className="flex items-center justify-between gap-3 bg-gray-50 border-b px-5 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Calendar className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />
            <time dateTime={booking.pickup_datetime}>
              {formatDateFr(booking.pickup_datetime)} à {formatTimeFr(booking.pickup_datetime)}
            </time>
          </span>
          <span className="text-xs text-muted-foreground tracking-wide">
            Réf. {formatReferenceCode(booking.reference_code)}
          </span>
        </span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            STATUS_BADGE_CLASSES[status]
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-brand-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900 leading-snug">
              {booking.pickup_address}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900 leading-snug">
              {booking.dropoff_address}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Car className="h-3.5 w-3.5" aria-hidden="true" />
            {VEHICLE_LABELS[booking.vehicle_type] ?? booking.vehicle_type}
          </span>
          {booking.trip_type === "aller_retour" && (
            <span className="rounded-full bg-brand-blue-50 text-brand-blue-700 px-2.5 py-0.5 font-semibold">
              Aller-retour
            </span>
          )}
          {booking.estimated_price && (
            <span className="font-bold text-brand-blue-700">
              {formatPrice(booking.estimated_price)}
            </span>
          )}
        </div>

        {hasDriver && (
          <div className="rounded-xl bg-brand-blue-50/60 border border-brand-blue-100 p-3 space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-brand-blue-600" aria-hidden="true" />
              {booking.driver_full_name}
            </p>
            {(booking.vehicle_brand || booking.vehicle_model || booking.vehicle_registration) && (
              <p className="text-xs text-gray-600 pl-6">
                {[booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(" ")}
                {booking.vehicle_registration ? ` — ${booking.vehicle_registration}` : ""}
              </p>
            )}
            {booking.driver_phone && (
              <a
                href={`tel:${booking.driver_phone}`}
                className="flex items-center gap-2 text-sm font-medium text-brand-blue-700 hover:underline pl-0"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {booking.driver_phone}
              </a>
            )}
          </div>
        )}

        {isCancelled ? (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
            <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            {STATUS_DESCRIPTIONS.cancelled}
          </div>
        ) : (
          <div>
            <ol
              className="flex items-center"
              aria-label={`Avancement : ${STATUS_LABELS[status]}`}
            >
              {STATUS_ORDER.map((step, i) => {
                const state = getStatusStepState(step, status);
                return (
                  <li key={step} className="flex-1 flex items-center last:flex-none">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0",
                        state === "done" && "bg-brand-green-500",
                        state === "active" &&
                          "bg-brand-blue-600 ring-4 ring-brand-blue-100",
                        state === "pending" && "bg-gray-200"
                      )}
                      aria-current={state === "active" ? "step" : undefined}
                    />
                    {i < STATUS_ORDER.length - 1 && (
                      <span
                        className={cn(
                          "h-0.5 flex-1",
                          state === "done" ? "bg-brand-green-500" : "bg-gray-200"
                        )}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="mt-2.5 text-sm text-gray-600">{STATUS_DESCRIPTIONS[status]}</p>
          </div>
        )}

        {status === "completed" && (
          <button
            type="button"
            onClick={() => openBookingReceipt(booking)}
            className="flex items-center gap-2 text-sm font-semibold text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Télécharger le justificatif
          </button>
        )}

        {allowCancel && isCancellable(status) && (
          <div className="border-t pt-3">
            {confirmingCancel ? (
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
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelMutation.isPending}
                  className="text-gray-500 hover:underline"
                >
                  Non
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Annuler cette réservation
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
