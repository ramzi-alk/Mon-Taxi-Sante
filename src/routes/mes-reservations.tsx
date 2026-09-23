import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, History, Phone, Mail, RefreshCw } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { useRealtime } from "~/hooks/useRealtime";
import { BookingStatusCard } from "~/components/booking/BookingStatusCard";
import { BookingRecoveryPanel } from "~/components/booking/BookingRecoveryPanel";
import { useToast } from "~/components/ui/toast";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL, CONTACT_EMAIL } from "~/lib/contact";
import { trackCallButtonClick } from "~/lib/trackCallClick";
import { usePhoneVisibility } from "~/hooks/usePhoneVisibility";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import { STATUS_LABELS, isTerminalStatus, type BookingStatus } from "~/lib/bookingStatus";
import { cn } from "~/lib/utils";

const PAST_PAGE_SIZE = 10;

// `ref` only ever carries the public reference code (e.g. from the
// confirmation email link) — never a phone number or anything else that
// would let a link alone unlock a booking. Malformed values are dropped
// rather than passed through.
const referenceCodePattern = /^[A-Z2-9]{4}-?[A-Z2-9]{4}$/i;
const myBookingsSearchSchema = z.object({
  ref: z
    .string()
    .regex(referenceCodePattern)
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute("/mes-reservations")({
  validateSearch: myBookingsSearchSchema,
  head: () => ({
    meta: [
      { title: "Mes réservations — Docteur Taxi" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MyBookingsPage,
});

async function fetchMyBookings() {
  return bookingsRepository.fetchMyBookings(supabase);
}

function MyBookingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { ref } = Route.useSearch();
  const phoneVisible = usePhoneVisibility();
  const [showAllPast, setShowAllPast] = useState(false);

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: fetchMyBookings,
    // Realtime (below) already invalidates this query on any change to the
    // patient's own bookings, so a longer staleTime here just avoids an
    // extra refetch on every navigation back to this page — it never masks
    // a stale status.
    staleTime: 30_000,
  });

  useRealtime({
    table: "bookings",
    queryKey: ["my-bookings"],
    event: "*",
    onChange: ({ old: oldRow, new: newRow }) => {
      const oldStatus = oldRow.status as BookingStatus | undefined;
      const newStatus = newRow.status as BookingStatus | undefined;
      if (newStatus && oldStatus && newStatus !== oldStatus) {
        toast({
          title: "Réservation mise à jour",
          description: STATUS_LABELS[newStatus],
          variant: newStatus === "cancelled" ? "error" : "success",
        });
      }
    },
  });

  const bookings = data ?? [];
  const active = bookings.filter((b) => !isTerminalStatus(b.status));
  const past = bookings.filter((b) => isTerminalStatus(b.status));

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-12 md:py-16 max-w-2xl">
        <p className="text-xs font-bold tracking-[0.15em] text-[#1244E8] uppercase mb-3">
          Suivi patient
        </p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0B0F1C]">
          Mes réservations
        </h1>
        <p className="mt-3 text-gray-500 leading-relaxed">
          Retrouvez ici l&apos;avancement de vos demandes en cours et
          l&apos;historique de vos trajets passés, depuis cet appareil.
        </p>

        {isLoading && (
          <div className="mt-10 flex items-center justify-center py-16">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue-600 border-t-transparent"
              aria-hidden="true"
            />
            <span className="ml-3 text-muted-foreground">Chargement…</span>
          </div>
        )}

        {isError && (
          <div className="mt-10 rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
            <p className="font-semibold">Impossible de charger vos réservations</p>
            <p className="text-sm mt-1">{error?.message}</p>
          </div>
        )}

        {!isLoading && !isError && bookings.length === 0 && (
          <div className="mt-10 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-10 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-lg font-semibold text-gray-700">
              Aucune réservation trouvée sur cet appareil
            </p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Le suivi est lié au navigateur utilisé pour réserver. Si vous
              avez réservé depuis un autre appareil, ou si l&apos;historique a
              été effacé, retrouvez-la ci-dessous avec sa référence, ou
              connectez-vous avec l&apos;email utilisé pour afficher tout
              votre historique — ou contactez-nous directement.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/reservation"
                className="btn-cta inline-flex items-center justify-center bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
              >
                Réserver un taxi
              </Link>
              {phoneVisible ? (
                <a
                  href={`tel:${CONTACT_PHONE_TEL}`}
                  onClick={() => trackCallButtonClick("my_bookings")}
                  className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {CONTACT_PHONE_DISPLAY}
                </a>
              ) : (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Nous écrire
                </a>
              )}
            </div>
          </div>
        )}

        {!isLoading && !isError && bookings.length === 0 && (
          <div className="mt-6">
            <BookingRecoveryPanel
              heading="Retrouver une réservation"
              description="Recherchez-la avec sa référence de réservation, ou connectez-vous avec l'email utilisé pour retrouver tout votre historique, quel que soit l'appareil."
              defaultReferenceCode={ref}
              excludeIds={bookings.map((b) => b.id)}
            />
          </div>
        )}

        {active.length > 0 && (
          <section aria-labelledby="active-heading" className="mt-10">
            <h2
              id="active-heading"
              className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-4"
            >
              <ClipboardList className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
              En cours ({active.length})
            </h2>
            <div className="space-y-4" aria-live="polite" aria-atomic="false">
              {active.map((booking) => (
                <BookingStatusCard key={booking.id} booking={booking} allowCancel allowEdit />
              ))}
            </div>
          </section>
        )}

        {past.length > 0 && (
          <section aria-labelledby="history-heading" className="mt-10">
            <h2
              id="history-heading"
              className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-4"
            >
              <History className="h-5 w-5 text-gray-500" aria-hidden="true" />
              Historique ({past.length})
            </h2>
            <div className="space-y-4" aria-live="polite" aria-atomic="false">
              {(showAllPast ? past : past.slice(0, PAST_PAGE_SIZE)).map((booking) => (
                <BookingStatusCard key={booking.id} booking={booking} />
              ))}
            </div>
            {!showAllPast && past.length > PAST_PAGE_SIZE && (
              <button
                type="button"
                onClick={() => setShowAllPast(true)}
                className="mt-4 text-sm font-medium text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Voir les {past.length - PAST_PAGE_SIZE} réservations précédentes
              </button>
            )}
          </section>
        )}

        {bookings.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["my-bookings"] })}
              disabled={isFetching}
              className="mt-8 flex items-center gap-1.5 text-sm font-medium text-brand-blue-600 hover:underline disabled:opacity-60 disabled:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} aria-hidden="true" />
              {isFetching ? "Actualisation…" : "Actualiser"}
            </button>

            <div className="mt-10">
              <BookingRecoveryPanel
                heading="Une réservation faite depuis un autre appareil n'apparaît pas ici ?"
                excludeIds={bookings.map((b) => b.id)}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
