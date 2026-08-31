import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Calendar, Car, User, Phone, Download, Pencil, Repeat } from "lucide-react";
import { formatDateFr, formatTimeFr, formatReferenceCode, cn } from "~/lib/utils";
import { bookingToPrefillData, storeBookingPrefill } from "~/lib/bookingPrefill";
import { VEHICLE_LABELS } from "~/lib/vehicle";
import { openBookingReceipt } from "~/lib/receipt";
import { StarRating } from "~/components/ui/star-rating";
import {
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  isCancellable,
  isEditable,
  isEditableAuthenticated,
  type BookingStatus,
} from "~/lib/bookingStatus";
import type { MyBookingRow, UpdateBookingPayload, LookupCredentials } from "~/repositories/bookingsRepository";
import { BookingEditForm } from "./BookingEditForm";
import { CancelBookingAction } from "./CancelBookingAction";
import { BookingRatingSection } from "./BookingRatingSection";
import { BookingProgressTimeline } from "./BookingProgressTimeline";
import { notifyBookingUpdatedServerFn } from "~/server/email";
import { logger } from "~/lib/logger";

interface BookingStatusCardProps {
  booking: MyBookingRow;
  /** Only the live session ("Mes réservations") or a verified reference+phone lookup may cancel. */
  allowCancel?: boolean;
  /** Only the live session ("Mes réservations") or a verified reference+phone lookup may edit. */
  allowEdit?: boolean;
  /** When set, cancel/edit prove ownership via reference_code + phone (lost-session recovery flow) instead of the live auth.uid() session. */
  lookupCredentials?: LookupCredentials;
}

/**
 * Composition root for a booking's card: display (header, route, driver
 * info) plus whichever actions apply (cancel, edit, rate, rebook). Each
 * action with its own state/mutation lives in its own component
 * (CancelBookingAction, BookingRatingSection) — a read-only consumer like
 * PatientEmailLogin only renders the display part below, without allowCancel
 * or allowEdit, and never pulls in the cancellation/rating mutations at all.
 */
export function BookingStatusCard({
  booking,
  allowCancel = false,
  allowEdit = false,
  lookupCredentials,
}: BookingStatusCardProps) {
  const [displayBooking, setDisplayBooking] = useState(booking);
  useEffect(() => {
    setDisplayBooking(booking);
  }, [booking]);

  const status = displayBooking.status as BookingStatus;
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  function handleRebook() {
    storeBookingPrefill(bookingToPrefillData(displayBooking));
    navigate({ to: "/reservation" });
  }

  const hasDriver = !!displayBooking.driver_full_name;

  const handleSaved = (payload: UpdateBookingPayload) => {
    setDisplayBooking((prev) => ({ ...prev, ...payload }));
    if (hasDriver) {
      notifyBookingUpdatedServerFn({ data: { bookingId: displayBooking.id } }).catch((err) => {
        logger.error("email.notifyBookingUpdated call failed", {
          error: err instanceof Error ? err.message : String(err),
          bookingId: displayBooking.id,
        });
      });
    }
  };

  return (
    <article
      className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden"
      aria-label={`Réservation du ${formatDateFr(displayBooking.pickup_datetime)}`}
    >
      <div className="flex items-center justify-between gap-3 bg-gray-50 border-b px-5 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Calendar className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />
            <time dateTime={displayBooking.pickup_datetime}>
              {formatDateFr(displayBooking.pickup_datetime)} à {formatTimeFr(displayBooking.pickup_datetime)}
            </time>
          </span>
          <span className="text-sm text-muted-foreground tracking-wide">
            Réf. {formatReferenceCode(displayBooking.reference_code)}
          </span>
        </span>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS_BADGE_CLASSES[status])}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-brand-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900 leading-snug">{displayBooking.pickup_address}</p>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900 leading-snug">{displayBooking.dropoff_address}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Car className="h-3.5 w-3.5" aria-hidden="true" />
            {VEHICLE_LABELS[displayBooking.vehicle_type] ?? displayBooking.vehicle_type}
          </span>
          {displayBooking.trip_type === "aller_retour" && (
            <span className="rounded-full bg-brand-blue-50 text-brand-blue-700 px-2.5 py-0.5 font-semibold">
              Aller-retour
            </span>
          )}
          {!!displayBooking.series_total && displayBooking.series_total > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-brand-blue-50 text-brand-blue-700 px-2.5 py-0.5 font-semibold">
              <Repeat className="h-3 w-3" aria-hidden="true" />
              Séance {displayBooking.series_index}/{displayBooking.series_total}
            </span>
          )}
        </div>

        {hasDriver && (
          <div className="rounded-xl bg-brand-blue-50/60 border border-brand-blue-100 p-3 space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-brand-blue-600" aria-hidden="true" />
              {displayBooking.driver_full_name}
              {displayBooking.driver_rating_avg != null && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                  <StarRating value={displayBooking.driver_rating_avg} readOnly size="sm" />
                  {displayBooking.driver_rating_avg.toFixed(1)}
                </span>
              )}
            </p>
            {(displayBooking.vehicle_brand || displayBooking.vehicle_model || displayBooking.vehicle_registration) && (
              <p className="text-sm text-gray-600 pl-6">
                {[displayBooking.vehicle_brand, displayBooking.vehicle_model].filter(Boolean).join(" ")}
                {displayBooking.vehicle_registration ? ` — ${displayBooking.vehicle_registration}` : ""}
              </p>
            )}
            {displayBooking.driver_phone && (
              <a
                href={`tel:${displayBooking.driver_phone}`}
                className="flex items-center gap-2 text-sm font-medium text-brand-blue-700 hover:underline pl-0"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {displayBooking.driver_phone}
              </a>
            )}
          </div>
        )}

        {editing ? (
          <BookingEditForm
            booking={displayBooking}
            lookupCredentials={lookupCredentials}
            onSaved={handleSaved}
            onClose={() => setEditing(false)}
          />
        ) : (
          <>
            <BookingProgressTimeline status={status} />

            {status === "completed" && (
              <button
                type="button"
                onClick={() => openBookingReceipt(displayBooking)}
                className="flex items-center gap-2 text-sm font-semibold text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Télécharger le justificatif
              </button>
            )}

            {status === "completed" && hasDriver && (
              <BookingRatingSection
                bookingId={displayBooking.id}
                patientRatingGiven={displayBooking.patient_rating_given}
                lookupCredentials={lookupCredentials}
                onRated={(rating) =>
                  setDisplayBooking((prev) => ({ ...prev, patient_rating_given: rating }))
                }
              />
            )}

            <div className="border-t pt-3">
              <button
                type="button"
                onClick={handleRebook}
                className="flex items-center gap-2 text-sm font-semibold text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <Repeat className="h-4 w-4" aria-hidden="true" />
                Réserver à nouveau avec ces informations
              </button>
            </div>

            {allowEdit && (lookupCredentials ? isEditable(status) : isEditableAuthenticated(status)) && (
              <div className="border-t pt-3">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Modifier cette réservation
                </button>
              </div>
            )}

            {allowEdit && !(lookupCredentials ? isEditable(status) : isEditableAuthenticated(status)) && isCancellable(status) && (
              <div className="border-t pt-3 text-sm text-gray-500">
                Cette réservation est déjà en cours de traitement et ne peut plus être
                modifiée. Pour changer un détail important, annulez-la puis créez-en une
                nouvelle.
              </div>
            )}

            {allowCancel && isCancellable(status) && (
              <div className="border-t pt-3">
                <CancelBookingAction
                  bookingId={displayBooking.id}
                  pickupDatetime={displayBooking.pickup_datetime}
                  lookupCredentials={lookupCredentials}
                  onCancelled={() => setDisplayBooking((prev) => ({ ...prev, status: "cancelled" }))}
                />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
