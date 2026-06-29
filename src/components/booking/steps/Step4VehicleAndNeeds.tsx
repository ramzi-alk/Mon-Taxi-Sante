import { UseFormReturn } from "react-hook-form";
import { Car, Ambulance, Users, Minus, Plus } from "lucide-react";
import { useEffect } from "react";
import { cn } from "~/lib/utils";
import { Checkbox } from "~/components/ui/checkbox";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

const vehicleOptions = [
  {
    value: "taxi" as const,
    icon: Car,
    title: "Taxi conventionné",
    description: "Patient autonome — berline confortable, tarif Assurance Maladie.",
    badge: "Le plus courant",
    badgeClass: "bg-brand-blue-100 text-brand-blue-700",
  },
  {
    value: "vsl" as const,
    icon: Car,
    title: "VSL (Véhicule Sanitaire Léger)",
    description: "Patient nécessitant une aide à la mobilité, pouvant s'asseoir.",
    badge: "Sur prescription",
    badgeClass: "bg-purple-100 text-purple-700",
  },
  {
    value: "pmr" as const,
    icon: Users,
    title: "Taxi PMR",
    description: "Fauteuil roulant manuel ou électrique — rampe d'accès homologuée.",
    badge: "PMR / Handicap",
    badgeClass: "bg-emerald-100 text-emerald-700",
  },
] as const;

export function Step4VehicleAndNeeds({ form }: StepProps) {
  const { register, watch, setValue, formState: { errors } } = form;

  const vehicleType = watch("vehicle_type");
  const requiresWheelchair = watch("requires_wheelchair");
  const requiresStretcher = watch("requires_stretcher");
  const requiresOxygen = watch("requires_oxygen");
  const passengerCount = watch("passenger_count");

  // Sync on mount in case form was pre-filled with stretcher=true
  useEffect(() => {
    if (requiresStretcher && vehicleType !== "ambulance") {
      setValue("vehicle_type", "ambulance");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAmbulaneFrced = requiresStretcher;
  const recommendedVehicle = !isAmbulaneFrced && requiresWheelchair ? "pmr" : null;
  const vehicleMismatch =
    recommendedVehicle !== null && vehicleType !== recommendedVehicle
      ? "Le fauteuil roulant nécessite un Taxi PMR aménagé."
      : null;

  function handleStretcherChange(checked: boolean) {
    setValue("requires_stretcher", checked);
    if (checked) {
      setValue("vehicle_type", "ambulance");
    } else if (vehicleType === "ambulance") {
      setValue("vehicle_type", "taxi");
    }
  }

  function changePassengers(delta: number) {
    const next = Math.max(1, Math.min(8, passengerCount + delta));
    setValue("passenger_count", next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Véhicule & besoins</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Indiquez vos besoins — le véhicule adapté sera sélectionné automatiquement.
        </p>
      </div>

      {/* Besoins particuliers */}
      <fieldset>
        <legend className="block text-sm font-semibold text-gray-700 mb-2.5">Besoins particuliers</legend>
        <div className="space-y-2">
          <label
            htmlFor="requires_wheelchair"
            className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white p-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Checkbox
              id="requires_wheelchair"
              checked={requiresWheelchair}
              onCheckedChange={(checked) => setValue("requires_wheelchair", checked === true)}
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">Fauteuil roulant</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manuel ou électrique — recommande un Taxi PMR aménagé.
              </p>
            </div>
          </label>

          <label
            htmlFor="requires_stretcher"
            className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white p-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Checkbox
              id="requires_stretcher"
              checked={requiresStretcher}
              onCheckedChange={(checked) => handleStretcherChange(checked === true)}
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">Brancard / position allongée</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transport couché — sélectionne une ambulance automatiquement.
              </p>
            </div>
          </label>

          <label
            htmlFor="requires_oxygen"
            className="flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white p-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <Checkbox
              id="requires_oxygen"
              checked={requiresOxygen}
              onCheckedChange={(checked) => setValue("requires_oxygen", checked === true)}
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">Oxygène thérapeutique</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Le chauffeur sera informé avant la prise en charge.
              </p>
            </div>
          </label>
        </div>
      </fieldset>

      {/* Passenger count — compact inline row */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <span className="flex-1 text-sm font-semibold text-gray-800">
          Passagers{" "}
          <span className="font-normal text-muted-foreground">(patient + accompagnant·s)</span>
        </span>
        <button
          type="button"
          onClick={() => changePassengers(-1)}
          disabled={passengerCount <= 1}
          aria-label="Réduire le nombre de passagers"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span
          className="w-7 text-center text-lg font-black text-brand-blue-600"
          aria-live="polite"
          aria-label={`${passengerCount} passager${passengerCount > 1 ? "s" : ""}`}
        >
          {passengerCount}
        </span>
        <button
          type="button"
          onClick={() => changePassengers(1)}
          disabled={passengerCount >= 8}
          aria-label="Augmenter le nombre de passagers"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <input type="hidden" {...register("passenger_count", { valueAsNumber: true })} />
      </div>

      <div className="border-t border-gray-100" />

      {/* Vehicle type */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-700">Véhicule médical</p>

        {isAmbulaneFrced ? (
          /* Ambulance locked when stretcher is required */
          <>
            <div className="flex items-center gap-3.5 rounded-xl border-2 border-brand-blue-500 bg-brand-blue-50/60 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue-600 text-white">
                <Ambulance className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-sm">Ambulance</span>
                  <span className="rounded-full bg-brand-blue-100 text-brand-blue-700 px-2 py-0.5 text-xs font-semibold">
                    Sélectionné automatiquement
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Transport en position allongée sur brancard.
                </p>
              </div>
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-brand-blue-600 bg-brand-blue-600"
                aria-hidden="true"
              >
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Taxi et VSL ne sont pas adaptés au brancard. Décochez &laquo;&nbsp;Brancard&nbsp;&raquo; pour choisir un autre véhicule.
            </p>
          </>
        ) : (
          /* Normal selection */
          <fieldset>
            <legend className="sr-only">Type de véhicule</legend>
            <div className="space-y-2">
              {vehicleMismatch && (
                <div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-sm text-amber-800">
                  ⚠️ {vehicleMismatch}
                </div>
              )}
              {vehicleOptions.map(({ value, icon: Icon, title, description, badge, badgeClass }) => {
                const isSelected = vehicleType === value;
                const isRecommended = recommendedVehicle === value;
                return (
                  <label
                    key={value}
                    htmlFor={`vehicle-${value}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-3.5 rounded-xl border-2 p-3.5 transition-all",
                      isSelected
                        ? "border-brand-blue-500 bg-brand-blue-50/60"
                        : isRecommended
                        ? "border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50"
                        : "border-gray-200 bg-white hover:border-brand-blue-200 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="radio"
                      id={`vehicle-${value}`}
                      value={value}
                      checked={isSelected}
                      onChange={() => setValue("vehicle_type", value)}
                      className="sr-only"
                      aria-describedby={`vehicle-desc-${value}`}
                    />
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        isSelected ? "bg-brand-blue-600 text-white" : "bg-gray-100 text-gray-500"
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{title}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badgeClass)}>
                          {badge}
                        </span>
                        {isRecommended && (
                          <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
                            ✓ Recommandé
                          </span>
                        )}
                      </div>
                      <p id={`vehicle-desc-${value}`} className="text-xs text-muted-foreground mt-0.5">
                        {description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isSelected ? "border-brand-blue-600 bg-brand-blue-600" : "border-gray-300 bg-white"
                      )}
                      aria-hidden="true"
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />}
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {errors.vehicle_type && (
          <p role="alert" className="text-sm text-red-600">
            {errors.vehicle_type.message}
          </p>
        )}
      </div>
    </div>
  );
}
