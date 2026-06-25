import { UseFormReturn } from "react-hook-form";
import { Minus, Plus } from "lucide-react";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

const specificityOptions = [
  {
    field: "requires_wheelchair" as const,
    label: "Fauteuil roulant",
    description: "Le patient utilise un fauteuil roulant (manuel ou électrique).",
    note: "Implique un véhicule PMR aménagé.",
  },
  {
    field: "requires_stretcher" as const,
    label: "Brancard / position allongée",
    description: "Le patient doit être transporté en position allongée.",
    note: "Exige un VSL ou ambulance.",
  },
  {
    field: "requires_oxygen" as const,
    label: "Oxygène thérapeutique",
    description: "Le patient nécessite de l'oxygène pendant le trajet.",
    note: "Le chauffeur sera informé avant la prise en charge.",
  },
];

export function Step6Specificities({ form }: StepProps) {
  const { register, watch, setValue } = form;
  const passengerCount = watch("passenger_count");

  function changePassengers(delta: number) {
    const next = Math.max(1, Math.min(8, passengerCount + delta));
    setValue("passenger_count", next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Besoins spécifiques</h2>
        <p className="mt-1 text-muted-foreground">
          Ces informations permettent de vous affecter le chauffeur et le véhicule
          le mieux adaptés à votre situation.
        </p>
      </div>

      {/* Specificities checkboxes */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3">
          Besoins particuliers (sélectionnez tout ce qui s&apos;applique)
        </legend>
        <div className="space-y-3">
          {specificityOptions.map(({ field, label, description, note }) => (
            <label
              key={field}
              htmlFor={field}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                id={field}
                {...register(field)}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500 cursor-pointer"
              />
              <div>
                <p className="font-semibold text-gray-800">{label}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
                <p className="text-xs text-brand-blue-600 font-medium mt-0.5">{note}</p>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Passenger count */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">
          Nombre de passagers (patient + accompagnant(s))
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => changePassengers(-1)}
            disabled={passengerCount <= 1}
            aria-label="Réduire le nombre de passagers"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex flex-col items-center min-w-[60px]">
            <span
              className="text-3xl font-black text-brand-blue-600"
              aria-live="polite"
              aria-label={`${passengerCount} passager${passengerCount > 1 ? "s" : ""}`}
            >
              {passengerCount}
            </span>
            <span className="text-xs text-muted-foreground">
              {passengerCount === 1 ? "passager" : "passagers"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => changePassengers(1)}
            disabled={passengerCount >= 8}
            aria-label="Augmenter le nombre de passagers"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>

          <p className="text-sm text-muted-foreground">
            Maximum 8 (limité par la capacité du véhicule)
          </p>
        </div>

        <input type="hidden" {...register("passenger_count", { valueAsNumber: true })} />
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
        Les accompagnants sont autorisés lors des transports médicaux Assurance Maladie sous
        certaines conditions. Le chauffeur confirmera la prise en charge selon
        l&apos;ordonnance.
      </div>
    </div>
  );
}
