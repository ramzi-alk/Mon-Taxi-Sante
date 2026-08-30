import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Search, AlertCircle, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { z } from "zod";
import { logger } from "~/lib/logger";
import { lookupBookingServerFn } from "~/server/bookingLookup";
import type { MyBookingRow } from "~/repositories/bookingsRepository";
import { BookingStatusCard } from "./BookingStatusCard";
import { Input } from "~/components/ui/input";
import { useTurnstile, TURNSTILE_SITE_KEY } from "~/hooks/useTurnstile";
import { saveLookup, isLookupSaved } from "~/lib/savedBookingLookups";

const frenchPhone = /^(\+33|0)[1-9](\d{2}){4}$/;
const referenceCodePattern = /^[A-Z2-9]{4}-?[A-Z2-9]{4}$/i;

const lookupSchema = z.object({
  reference_code: z
    .string()
    .regex(referenceCodePattern, "Référence invalide (format : K7H4-X9QF)"),
  phone: z.string().regex(frenchPhone, "Numéro de téléphone français invalide"),
});

type LookupSchema = z.infer<typeof lookupSchema>;

async function lookupBooking(
  data: LookupSchema & { turnstileToken: string }
): Promise<MyBookingRow | null> {
  return lookupBookingServerFn({
    data: { ...data, reference_code: data.reference_code.replace(/-/g, "").toUpperCase() },
  });
}

export function BookingLookupForm({ defaultReferenceCode }: { defaultReferenceCode?: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupSchema>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { reference_code: defaultReferenceCode ?? "" },
  });

  const { containerRef, token, reset } = useTurnstile(TURNSTILE_SITE_KEY);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [credentials, setCredentials] = useState<{ referenceCode: string; phone: string } | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const { mutate, data: found, isPending, isSuccess, error } = useMutation({
    mutationFn: lookupBooking,
    onSettled: reset,
    onError: (err: Error) => {
      logger.warn("booking.lookup failed", { error: err.message });
    },
  });

  const onSubmit = (data: LookupSchema) => {
    if (!token) {
      setCaptchaRequired(true);
      return;
    }
    setCaptchaRequired(false);
    setJustSaved(false);
    const referenceCode = data.reference_code.replace(/-/g, "").toUpperCase();
    setCredentials({ referenceCode, phone: data.phone });
    mutate({ ...data, turnstileToken: token });
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-6">
      <h3 className="text-base font-bold text-gray-900">
        Retrouver une réservation avec sa référence
      </h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
        Réservé depuis un autre appareil, ou navigateur réinitialisé ? Entrez
        la référence affichée sur votre page de confirmation et le numéro de
        téléphone utilisé pour la réservation.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-4 space-y-3"
        aria-label="Retrouver une réservation"
      >
        <div className="space-y-1">
          <label htmlFor="reference_code" className="block text-xs font-semibold text-gray-700">
            Référence de réservation
          </label>
          <Input
            id="reference_code"
            type="text"
            placeholder="K7H4-X9QF"
            aria-invalid={!!errors.reference_code}
            {...register("reference_code")}
            className="uppercase placeholder:normal-case"
          />
          {errors.reference_code && (
            <p role="alert" className="text-xs text-red-600">
              {errors.reference_code.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="lookup_phone" className="block text-xs font-semibold text-gray-700">
            Numéro de téléphone utilisé
          </label>
          <Input
            id="lookup_phone"
            type="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          {errors.phone && (
            <p role="alert" className="text-xs text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>

        {TURNSTILE_SITE_KEY && <div ref={containerRef} />}
        {captchaRequired && (
          <p role="alert" className="text-xs text-red-600">
            Veuillez valider la vérification anti-robot avant de continuer.
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-brand-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-blue-700 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          {error.message.includes("Trop de tentatives") || error.message.includes("anti-robot")
            ? error.message
            : "Une erreur est survenue. Vérifiez les informations et réessayez."}
        </div>
      )}

      {isSuccess && !found && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-700"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          Aucune réservation ne correspond à cette référence et ce numéro.
        </div>
      )}

      {found && credentials && (
        <div className="mt-4 space-y-3">
          {isLookupSaved(credentials.referenceCode) || justSaved ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-brand-green-700">
              <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
              Enregistrée sur cet appareil — elle apparaîtra désormais dans
              &laquo;&nbsp;Mes réservations&nbsp;&raquo; sans avoir à la
              rechercher à nouveau.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                saveLookup(credentials.referenceCode, credentials.phone);
                setJustSaved(true);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
              Ajouter cette réservation à cet appareil
            </button>
          )}
          <BookingStatusCard
            booking={found}
            allowCancel
            allowEdit
            lookupCredentials={credentials}
          />
        </div>
      )}
    </div>
  );
}
