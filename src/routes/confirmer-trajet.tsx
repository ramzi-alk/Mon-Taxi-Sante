import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { formatDateFr, formatTimeFr, formatReferenceCode } from "~/lib/utils";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import { notifyBookingCancelledServerFn } from "~/server/email";
import { logger } from "~/lib/logger";

const confirmerTrajetSearchSchema = z.object({
  token: z.string().min(20),
});

export const Route = createFileRoute("/confirmer-trajet")({
  validateSearch: confirmerTrajetSearchSchema,
  head: () => ({
    meta: [
      { title: "Confirmer mon trajet — Mon Taxi Santé" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfirmerTrajetPage,
});

type Outcome = "confirmed" | "cancelled" | null;

function ConfirmerTrajetPage() {
  const { token } = Route.useSearch();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ["reminder-token", token],
    queryFn: () => bookingsRepository.resolveReminderToken(supabase, token),
    enabled: outcome === null,
  });

  const confirmMutation = useMutation({
    mutationFn: () => bookingsRepository.confirmReminderToken(supabase, token),
    onSuccess: () => setOutcome("confirmed"),
    onError: (err: Error) => {
      logger.error("confirmerTrajet.confirm failed", { error: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsRepository.cancelBookingViaReminder(supabase, token),
    onSuccess: (bookingId) => {
      setOutcome("cancelled");
      notifyBookingCancelledServerFn({ data: { bookingId } }).catch((err) => {
        logger.error("email.notifyBookingCancelled call failed", {
          error: err instanceof Error ? err.message : String(err),
          bookingId,
        });
      });
    },
    onError: (err: Error) => {
      setConfirmingCancel(false);
      logger.error("confirmerTrajet.cancel failed", { error: err.message });
    },
  });

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-12 md:py-16 max-w-xl">
        <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-3">
          Rappel de course
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0B0F1C]">
          Confirmer mon trajet
        </h1>

        {outcome === "confirmed" && (
          <div className="mt-10 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-brand-green-500 mx-auto mb-3" aria-hidden="true" />
            <p className="text-lg font-semibold text-gray-900">C&apos;est noté, à demain !</p>
            <p className="text-sm text-muted-foreground mt-2">
              Votre trajet est confirmé, aucune action supplémentaire n&apos;est nécessaire.
            </p>
          </div>
        )}

        {outcome === "cancelled" && (
          <div className="mt-10 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-8 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
            <p className="text-lg font-semibold text-gray-900">Trajet annulé</p>
            <p className="text-sm text-muted-foreground mt-2">
              Votre réservation a bien été annulée. Le chauffeur affecté en a été informé.
            </p>
          </div>
        )}

        {outcome === null && isLoading && (
          <div className="mt-10 flex items-center justify-center py-16">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue-600 border-t-transparent"
              aria-hidden="true"
            />
            <span className="ml-3 text-muted-foreground">Chargement…</span>
          </div>
        )}

        {outcome === null && !isLoading && (isError || !booking) && (
          <div className="mt-10 rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
            <AlertTriangle className="h-10 w-10 mx-auto mb-2" aria-hidden="true" />
            <p className="font-semibold">Ce lien de confirmation n&apos;est plus valide</p>
            <p className="text-sm mt-1 text-red-600">
              Il a peut-être déjà été utilisé ou a expiré. Contactez-nous si besoin d&apos;aide.
            </p>
          </div>
        )}

        {outcome === null && !isLoading && booking && (
          <article className="mt-10 rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
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
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-brand-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900 leading-snug">{booking.pickup_address}</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900 leading-snug">{booking.dropoff_address}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Merci de confirmer que ce trajet est toujours prévu, ou de l&apos;annuler si vous n&apos;en
                avez plus besoin.
              </p>

              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending || confirmingCancel}
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-brand-blue-600 hover:bg-brand-blue-700 disabled:opacity-60 rounded-full px-4 py-2 transition-colors"
                >
                  {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Confirmer mon trajet
                </button>

                {confirmingCancel ? (
                  <span className="flex items-center gap-3 text-sm">
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
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(true)}
                    disabled={confirmMutation.isPending}
                    className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:underline disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Annuler ce trajet
                  </button>
                )}
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
