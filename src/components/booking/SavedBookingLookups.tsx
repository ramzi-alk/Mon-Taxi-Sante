import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BookmarkCheck, RefreshCw, AlertCircle } from "lucide-react";
import { lookupSavedBookingsServerFn } from "~/server/bookingLookup";
import type { MyBookingRow } from "~/repositories/bookingsRepository";
import { listSavedLookups, type SavedLookup } from "~/lib/savedBookingLookups";
import { BookingStatusCard } from "./BookingStatusCard";
import { useTurnstile, TURNSTILE_SITE_KEY } from "~/hooks/useTurnstile";
import { formatReferenceCode } from "~/lib/utils";
import { logger } from "~/lib/logger";

type LookupResult = { referenceCode: string; booking: MyBookingRow | null };

async function fetchSaved(lookups: SavedLookup[], turnstileToken: string): Promise<LookupResult[]> {
  return lookupSavedBookingsServerFn({
    data: {
      turnstileToken,
      lookups: lookups.map(({ referenceCode, phone }) => ({ referenceCode, phone })),
    },
  });
}

/**
 * Réservations retrouvées via BookingLookupForm puis "ajoutées à cet
 * appareil" (voir src/lib/savedBookingLookups.ts) — persistantes d'une
 * visite à l'autre, contrairement à la recherche ponctuelle. On ne mémorise
 * jamais le contenu de la réservation, seulement de quoi relancer la
 * recherche : une vérification anti-robot reste donc nécessaire pour
 * afficher les résultats, mais une seule couvre tout le lot au lieu d'une
 * par réservation (voir lookupSavedBookingsServerFn).
 */
export function SavedBookingLookups() {
  const [saved] = useState<SavedLookup[]>(() => listSavedLookups());
  const { containerRef, token, reset } = useTurnstile(TURNSTILE_SITE_KEY);
  const [captchaRequired, setCaptchaRequired] = useState(false);

  const { mutate, data: results, isPending, isSuccess, error } = useMutation({
    mutationFn: (t: string) => fetchSaved(saved, t),
    onSettled: reset,
    onError: (err: Error) => {
      logger.warn("bookings.lookupSaved failed", { error: err.message });
    },
  });

  if (saved.length === 0) return null;

  function handleShow() {
    if (!token) {
      setCaptchaRequired(true);
      return;
    }
    setCaptchaRequired(false);
    mutate(token);
  }

  return (
    <section aria-labelledby="saved-lookups-heading" className="mt-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 id="saved-lookups-heading" className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <BookmarkCheck className="h-5 w-5 text-brand-blue-600" aria-hidden="true" />
          Réservations enregistrées sur cet appareil
        </h2>
        {isSuccess && (
          <button
            type="button"
            onClick={handleShow}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-blue-600 hover:underline disabled:opacity-60"
          >
            <RefreshCw className={isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden="true" />
            Actualiser
          </button>
        )}
      </div>

      {!isSuccess && (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {saved.length === 1
              ? "1 réservation ajoutée précédemment via une recherche par référence."
              : `${saved.length} réservations ajoutées précédemment via une recherche par référence.`}{" "}
            Une vérification est nécessaire pour les afficher.
          </p>
          <div className="flex flex-wrap gap-2">
            {saved.map((l) => (
              <span
                key={l.referenceCode}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-mono text-gray-600"
              >
                {formatReferenceCode(l.referenceCode)}
              </span>
            ))}
          </div>
          {TURNSTILE_SITE_KEY && <div ref={containerRef} />}
          {captchaRequired && (
            <p role="alert" className="text-xs text-red-600">
              Veuillez valider la vérification anti-robot avant de continuer.
            </p>
          )}
          <button
            type="button"
            onClick={handleShow}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-brand-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {isPending ? "Vérification…" : "Afficher ces réservations"}
          </button>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              Une erreur est survenue. Réessayez.
            </div>
          )}
        </div>
      )}

      {isSuccess && (
        <div className="space-y-4">
          {results.map(({ referenceCode, booking }) =>
            booking ? (
              <BookingStatusCard
                key={referenceCode}
                booking={booking}
                allowCancel
                allowEdit
                lookupCredentials={{
                  referenceCode,
                  phone: saved.find((l) => l.referenceCode === referenceCode)?.phone ?? "",
                }}
              />
            ) : (
              <div
                key={referenceCode}
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-700"
              >
                <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                Réf. {formatReferenceCode(referenceCode)} introuvable — elle a
                peut-être été annulée ou son numéro de téléphone associé a changé.
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
