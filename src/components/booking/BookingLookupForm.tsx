import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Search, AlertCircle } from "lucide-react";
import { z } from "zod";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { MyBookingRow } from "~/repositories/bookingsRepository";
import { BookingStatusCard } from "./BookingStatusCard";

const frenchPhone = /^(\+33|0)[1-9](\d{2}){4}$/;

const lookupSchema = z.object({
  booking_id: z.string().uuid("Référence invalide (ex : 8b1e0c2a-...-...)"),
  phone: z.string().regex(frenchPhone, "Numéro de téléphone français invalide"),
});

type LookupSchema = z.infer<typeof lookupSchema>;

async function lookupBooking(data: LookupSchema): Promise<MyBookingRow | null> {
  return bookingsRepository.lookupBookingByReference(supabase, data.booking_id, data.phone);
}

export function BookingLookupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupSchema>({ resolver: zodResolver(lookupSchema) });

  const { mutate, data: found, isPending, isSuccess, error } = useMutation({
    mutationFn: lookupBooking,
    onError: (err: Error) => {
      logger.warn("booking.lookup failed", { error: err.message });
    },
  });

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
        onSubmit={handleSubmit((data) => mutate(data))}
        noValidate
        className="mt-4 space-y-3"
        aria-label="Retrouver une réservation"
      >
        <div className="space-y-1">
          <label htmlFor="booking_id" className="block text-xs font-semibold text-gray-700">
            Référence de réservation
          </label>
          <input
            id="booking_id"
            type="text"
            placeholder="8b1e0c2a-4f3d-4e2b-9a1c-..."
            aria-invalid={!!errors.booking_id}
            {...register("booking_id")}
            className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
          />
          {errors.booking_id && (
            <p role="alert" className="text-xs text-red-600">
              {errors.booking_id.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="lookup_phone" className="block text-xs font-semibold text-gray-700">
            Numéro de téléphone utilisé
          </label>
          <input
            id="lookup_phone"
            type="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
            aria-invalid={!!errors.phone}
            {...register("phone")}
            className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
          />
          {errors.phone && (
            <p role="alert" className="text-xs text-red-600">
              {errors.phone.message}
            </p>
          )}
        </div>

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
          Une erreur est survenue. Vérifiez les informations et réessayez.
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

      {found && (
        <div className="mt-4">
          <BookingStatusCard booking={found} />
        </div>
      )}
    </div>
  );
}
