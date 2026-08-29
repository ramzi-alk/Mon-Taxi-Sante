import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, MapPin, Calendar, ShieldCheck, Phone, ClipboardList } from "lucide-react";
import { supabase } from "~/lib/supabase";
import { formatDateFr, formatTimeFr, formatReferenceCode, cn } from "~/lib/utils";
import { logger } from "~/lib/logger";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import { trackCallButtonClick } from "~/lib/trackCallClick";
import { usePhoneVisibility } from "~/hooks/usePhoneVisibility";
import { useRealtime } from "~/hooks/useRealtime";
import { STATUS_LABELS, STATUS_BADGE_CLASSES, type BookingStatus } from "~/lib/bookingStatus";
import { CPAM_LABELS } from "~/lib/cpam";

const confirmationSearchSchema = z.object({
  id: z.string(),
  seriesTotal: z.coerce.number().optional(),
});

export const Route = createFileRoute("/reservation/confirmation")({
  validateSearch: confirmationSearchSchema,
  head: () => ({
    meta: [
      { title: "Réservation confirmée — Docteur Taxi" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
});

async function fetchBooking(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, reference_code, pickup_address, dropoff_address, pickup_datetime, cpam_status, status"
    )
    .eq("id", id)
    .single();

  if (error) {
    logger.error("booking.fetchConfirmation failed", { error: error.message, id });
    throw new Error(error.message);
  }
  return data;
}

function ConfirmationPage() {
  const { id, seriesTotal } = Route.useSearch();
  const isSeries = !!seriesTotal && seriesTotal > 1;
  const phoneVisible = usePhoneVisibility();

  const { data: booking, isLoading, isError } = useQuery({
    queryKey: ["booking-confirmation", id],
    queryFn: () => fetchBooking(id),
  });

  useRealtime({
    table: "bookings",
    queryKey: ["booking-confirmation", id],
    event: "UPDATE",
    filter: `id=eq.${id}`,
  });

  return (
    <section className="bg-[#F7F8FC] min-h-[calc(100vh-4rem)]">
      <div className="container py-16 md:py-24 max-w-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-50 mb-5">
            <CheckCircle2 className="h-9 w-9 text-brand-green-600" aria-hidden="true" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0B0F1C]">
            Réservation confirmée
          </h1>
          <p className="mt-3 text-gray-500 leading-relaxed">
            Vous recevrez une confirmation par email. Un chauffeur
            conventionné Assurance Maladie va accepter votre course.
          </p>
          {isSeries && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-blue-50 px-4 py-1.5 text-sm font-semibold text-brand-blue-700">
              Série de {seriesTotal} séances réservées
            </p>
          )}
        </div>

        {isLoading && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 text-center text-muted-foreground">
            Chargement du récapitulatif…
          </div>
        )}

        {isError && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 text-center text-muted-foreground">
            Votre réservation a bien été enregistrée. Nous n&apos;avons pas pu
            charger le récapitulatif détaillé, mais vous recevrez toutes les
            informations par email.
          </div>
        )}

        {booking && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="bg-brand-blue-600 px-5 py-4 text-white flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium opacity-80">
                  Référence réservation
                </p>
                <p className="text-lg font-bold mt-0.5 tracking-wide">
                  {formatReferenceCode(booking.reference_code)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                  STATUS_BADGE_CLASSES[booking.status as BookingStatus]
                )}
              >
                {STATUS_LABELS[booking.status as BookingStatus]}
              </span>
            </div>
            <div className="px-5">
              <div className="flex items-start gap-3 py-3 border-b border-gray-100">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Trajet</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {booking.pickup_address} → {booking.dropoff_address}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3 border-b border-gray-100">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Date & heure</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {formatDateFr(booking.pickup_datetime)} à{" "}
                    {formatTimeFr(booking.pickup_datetime)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3">
                <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Prise en charge</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {CPAM_LABELS[booking.cpam_status] ?? booking.cpam_status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/mes-reservations"
            className="btn-cta inline-flex items-center justify-center gap-2 bg-[#0B0F1C] text-white hover:bg-[#1244E8] transition-colors"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            {isSeries ? "Suivre mes réservations" : "Suivre ma réservation"}
          </Link>
          {phoneVisible && (
            <a
              href={`tel:${CONTACT_PHONE_TEL}`}
              onClick={() => trackCallButtonClick("booking_confirmation")}
              className="btn-cta inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {CONTACT_PHONE_DISPLAY}
            </a>
          )}
        </div>

        <p className="mt-5 text-center">
          <Link to="/" className="text-sm font-medium text-gray-500 hover:text-gray-700 underline">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </section>
  );
}
