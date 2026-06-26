import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, History, Phone } from "lucide-react";
import { supabase } from "~/lib/supabase";
import { useRealtime } from "~/hooks/useRealtime";
import { BookingStatusCard } from "~/components/booking/BookingStatusCard";
import { BookingLookupForm } from "~/components/booking/BookingLookupForm";
import { useToast } from "~/components/ui/toast";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import { STATUS_LABELS, isTerminalStatus, type BookingStatus } from "~/lib/bookingStatus";

export const Route = createFileRoute("/mes-reservations")({
  head: () => ({
    meta: [
      { title: "Mes réservations — Mon Taxi Santé" },
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: fetchMyBookings,
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
              contactez-nous directement.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/reservation"
                className="btn-cta inline-flex items-center justify-center bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
              >
                Réserver un taxi
              </Link>
              <a
                href={`tel:${CONTACT_PHONE_TEL}`}
                className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {CONTACT_PHONE_DISPLAY}
              </a>
            </div>
          </div>
        )}

        {!isLoading && !isError && bookings.length === 0 && (
          <div className="mt-6">
            <BookingLookupForm />
          </div>
        )}

        {active.length > 0 && (
          <section aria-labelledby="active-heading" className="mt-10">
            <h2
              id="active-heading"
              className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-4"
            >
              <ClipboardList className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
              En cours
            </h2>
            <div className="space-y-4">
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
              Historique
            </h2>
            <div className="space-y-4">
              {past.map((booking) => (
                <BookingStatusCard key={booking.id} booking={booking} />
              ))}
            </div>
          </section>
        )}

        {bookings.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["my-bookings"] })}
              className="mt-8 text-sm font-medium text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Actualiser
            </button>

            <section aria-labelledby="lookup-heading" className="mt-10">
              <h2 id="lookup-heading" className="text-sm font-semibold text-gray-500 mb-3">
                Une réservation faite depuis un autre appareil n&apos;apparaît pas ici ?
              </h2>
              <BookingLookupForm />
            </section>
          </>
        )}
      </div>
    </section>
  );
}
