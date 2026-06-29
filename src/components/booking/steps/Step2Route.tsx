import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { MapPin, Navigation, ArrowDown, Loader2, Route } from "lucide-react";
import type { BookingSchema } from "../schema";
import { AddressAutocomplete } from "../AddressAutocomplete";
import { getDrivingDistanceKm } from "~/lib/mapbox";
import { logger } from "~/lib/logger";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

export function Step2Route({ form }: StepProps) {
  const {
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = form;

  const [isComputingDistance, setIsComputingDistance] = useState(false);

  const pickupAddress = watch("pickup_address");
  const dropoffAddress = watch("dropoff_address");
  const pickupLat = watch("pickup_lat");
  const pickupLng = watch("pickup_lng");
  const dropoffLat = watch("dropoff_lat");
  const dropoffLng = watch("dropoff_lng");
  const distanceKm = watch("distance_km");

  useEffect(() => {
    if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
      return;
    }

    let cancelled = false;
    setIsComputingDistance(true);
    getDrivingDistanceKm(
      { lat: pickupLat, lng: pickupLng },
      { lat: dropoffLat, lng: dropoffLng }
    )
      .then((km) => {
        if (!cancelled) setValue("distance_km", km);
      })
      .catch((err) => {
        logger.warn("step2_route.distance_failed", { error: (err as Error).message });
      })
      .finally(() => {
        if (!cancelled) setIsComputingDistance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, setValue]);

  function swapAddresses() {
    const pickupMunicipality = watch("pickup_municipality");
    const dropoffMunicipality = watch("dropoff_municipality");
    setValue("pickup_address", dropoffAddress);
    setValue("pickup_lat", dropoffLat);
    setValue("pickup_lng", dropoffLng);
    setValue("pickup_municipality", dropoffMunicipality);
    setValue("dropoff_address", pickupAddress);
    setValue("dropoff_lat", pickupLat);
    setValue("dropoff_lng", pickupLng);
    setValue("dropoff_municipality", pickupMunicipality);
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
        <AddressAutocomplete
          id="pickup_address"
          value={pickupAddress}
          onChange={(val) => {
            setValue("pickup_address", val);
            setValue("pickup_lat", null);
            setValue("pickup_lng", null);
            setValue("pickup_municipality", null);
            setValue("distance_km", null);
          }}
          onSelect={(suggestion) => {
            setValue("pickup_lat", suggestion.lat);
            setValue("pickup_lng", suggestion.lng);
            setValue("pickup_municipality", suggestion.municipality);
            trigger("pickup_address");
          }}
          onBlur={() => trigger("pickup_address")}
          placeholder="Ex : 15 Rue de la Paix, 75001 Paris"
          icon={<Navigation className="h-5 w-5 text-brand-blue-500" aria-hidden="true" />}
          ariaDescribedBy={errors.pickup_address ? "pickup-error" : "pickup-hint"}
          ariaInvalid={!!errors.pickup_address}
          ariaRequired
        />
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
        <AddressAutocomplete
          id="dropoff_address"
          value={dropoffAddress}
          onChange={(val) => {
            setValue("dropoff_address", val);
            setValue("dropoff_lat", null);
            setValue("dropoff_lng", null);
            setValue("dropoff_municipality", null);
            setValue("distance_km", null);
          }}
          onSelect={(suggestion) => {
            setValue("dropoff_lat", suggestion.lat);
            setValue("dropoff_lng", suggestion.lng);
            setValue("dropoff_municipality", suggestion.municipality);
            trigger("dropoff_address");
          }}
          onBlur={() => trigger("dropoff_address")}
          placeholder="Ex : Hôpital Lariboisière, Paris"
          icon={<MapPin className="h-5 w-5 text-red-500" aria-hidden="true" />}
          ariaDescribedBy={errors.dropoff_address ? "dropoff-error" : "dropoff-hint"}
          ariaInvalid={!!errors.dropoff_address}
          ariaRequired
        />
        <p id="dropoff-hint" className="text-xs text-muted-foreground">
          Hôpital, clinique, cabinet médical, centre de dialyse…
        </p>
        {errors.dropoff_address && (
          <p id="dropoff-error" role="alert" className="text-sm text-red-600">
            {errors.dropoff_address.message}
          </p>
        )}
      </div>

      {/* Distance estimée */}
      <div
        className="rounded-xl bg-gray-100 h-16 flex items-center justify-center gap-2 text-sm border border-dashed border-gray-300"
        aria-live="polite"
      >
        {isComputingDistance ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Calcul de la distance…</span>
          </>
        ) : distanceKm != null ? (
          <>
            <Route className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />
            <span className="font-medium text-gray-900">
              Distance estimée : {distanceKm} km (trajet routier)
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">Aperçu du trajet</span>
        )}
      </div>
    </div>
  );
}
