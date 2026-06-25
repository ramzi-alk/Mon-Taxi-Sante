import { UseFormReturn } from "react-hook-form";
import { MapPin, Navigation, ArrowDown } from "lucide-react";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

export function Step2Route({ form }: StepProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  // In production: integrate Google Places Autocomplete here
  // For now: plain text inputs with instructions
  const pickupAddress = watch("pickup_address");
  const dropoffAddress = watch("dropoff_address");

  function swapAddresses() {
    const pickup = pickupAddress;
    const dropoff = dropoffAddress;
    setValue("pickup_address", dropoff);
    setValue("dropoff_address", pickup);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Adresses de départ et d&apos;arrivée</h2>
        <p className="mt-1 text-muted-foreground">
          Saisissez l&apos;adresse exacte de prise en charge et celle de votre
          établissement de soin.
        </p>
      </div>

      {/* Pickup */}
      <div className="space-y-1.5">
        <label htmlFor="pickup_address" className="block text-sm font-semibold text-gray-700">
          Adresse de départ{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <Navigation
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-blue-500"
            aria-hidden="true"
          />
          <input
            id="pickup_address"
            type="text"
            autoComplete="street-address"
            placeholder="Ex : 15 Rue de la Paix, 75001 Paris"
            aria-required="true"
            aria-describedby={errors.pickup_address ? "pickup-error" : "pickup-hint"}
            {...register("pickup_address")}
            className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={!!errors.pickup_address}
          />
        </div>
        <p id="pickup-hint" className="text-xs text-muted-foreground">
          Votre domicile ou autre lieu de prise en charge.
        </p>
        {errors.pickup_address && (
          <p id="pickup-error" role="alert" className="text-sm text-red-600">
            {errors.pickup_address.message}
          </p>
        )}
      </div>

      {/* Swap button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={swapAddresses}
          className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-2 text-sm text-muted-foreground hover:bg-gray-100 hover:border-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Inverser les adresses de départ et d'arrivée"
        >
          <ArrowDown className="h-4 w-4 rotate-180" aria-hidden="true" />
          Inverser les adresses
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Dropoff */}
      <div className="space-y-1.5">
        <label htmlFor="dropoff_address" className="block text-sm font-semibold text-gray-700">
          Adresse de destination{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <MapPin
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500"
            aria-hidden="true"
          />
          <input
            id="dropoff_address"
            type="text"
            placeholder="Ex : Hôpital Lariboisière, Paris"
            aria-required="true"
            aria-describedby={errors.dropoff_address ? "dropoff-error" : "dropoff-hint"}
            {...register("dropoff_address")}
            className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={!!errors.dropoff_address}
          />
        </div>
        <p id="dropoff-hint" className="text-xs text-muted-foreground">
          Hôpital, clinique, cabinet médical, centre de dialyse…
        </p>
        {errors.dropoff_address && (
          <p id="dropoff-error" role="alert" className="text-sm text-red-600">
            {errors.dropoff_address.message}
          </p>
        )}
      </div>

      {/* Map placeholder */}
      <div
        className="rounded-xl bg-gray-100 h-40 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-gray-300"
        aria-hidden="true"
      >
        <span>Aperçu du trajet (Google Maps)</span>
      </div>
    </div>
  );
}
