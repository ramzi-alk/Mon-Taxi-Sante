import { UseFormReturn } from "react-hook-form";
import { Car, Ambulance, Users, Minus, Plus } from "lucide-react";
import { cn } from "~/lib/utils";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "~/lib/contact";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

const vehicleOptions = [
  {
    value: "taxi" as const,
    icon: Car,
    title: "Taxi conventionné",
    description: "Pour les patients pouvant se déplacer de manière autonome. Berline confortable.",
    badge: "Le plus courant",
    badgeColor: "bg-brand-blue-100 text-brand-blue-700",
    details: ["Idéal pour consultations ambulatoires", "Confort et discrétion", "Tarif officiel AM"],
    recommendedWhen: [] as string[],
  },
  {
    value: "vsl" as const,
    icon: Ambulance,
    title: "VSL (Véhicule Sanitaire Léger)",
    description: "Pour les patients nécessitant une aide à la mobilité mais pouvant s'asseoir.",
    badge: "Sur prescription",
    badgeColor: "bg-purple-100 text-purple-700",
    details: ["Chauffeur auxiliaire de santé", "Aide à la montée/descente", "Position allongée possible"],
    recommendedWhen: ["requires_stretcher"],
  },
  {
    value: "pmr" as const,
    icon: Users,
    title: "Taxi PMR (Handicap)",
    description: "Véhicule entièrement aménagé pour les fauteuils roulants et PMR.",
    badge: "PMR / Handicap",
    badgeColor: "bg-brand-green-100 text-brand-green-700",
    details: ["Rampe d'accès électrique", "Fixation fauteuil homologuée", "Espace adapté"],
    recommendedWhen: ["requires_wheelchair"],
  },
] as const;

const specificityOptions = [
  {
    field: "requires_wheelchair" as const,
    label: "Fauteuil roulant",
    description: "Le patient utilise un fauteuil roulant (manuel ou électrique).",
    note: "→ Recommande un taxi PMR aménagé.",
  },
  {
    field: "requires_stretcher" as const,
    label: "Brancard / position allongée",
    description: "Le patient doit être transporté en position allongée.",
    note: "→ Recommande un VSL.",
  },
  {
    field: "requires_oxygen" as const,
    label: "Oxygène thérapeutique",
    description: "Le patient nécessite de l'oxygène pendant le trajet.",
    note: "→ Le chauffeur sera informé avant la prise en charge.",
  },
];

function getRecommendedVehicle(
  requiresWheelchair: boolean,
  requiresStretcher: boolean
): "taxi" | "vsl" | "pmr" | null {
  if (requiresWheelchair) return "pmr";
  if (requiresStretcher) return "vsl";
  return null;
}

export function Step4VehicleAndNeeds({ form }: StepProps) {
  const { register, watch, setValue, formState: { errors } } = form;

  const vehicleType = watch("vehicle_type");
  const requiresWheelchair = watch("requires_wheelchair");
  const requiresStretcher = watch("requires_stretcher");
  const passengerCount = watch("passenger_count");

  const recommended = getRecommendedVehicle(requiresWheelchair, requiresStretcher);

  const vehicleMismatch =
    recommended !== null && vehicleType !== recommended
      ? recommended === "pmr"
        ? "Le fauteuil roulant nécessite un Taxi PMR aménagé."
        : "La position allongée nécessite un VSL."
      : null;

  function changePassengers(delta: number) {
    const next = Math.max(1, Math.min(8, passengerCount + delta));
    setValue("passenger_count", next);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Véhicule & besoins spécifiques</h2>
        <p className="mt-1 text-muted-foreground">
          Précisez vos besoins — le type de véhicule adapté sera mis en avant automatiquement.
        </p>
      </div>

      {/* ── Besoins spécifiques ── */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">Besoins particuliers</h3>
        <fieldset>
          <legend className="sr-only">Besoins particuliers</legend>
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
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">
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

            <p className="text-sm text-muted-foreground">Maximum 8</p>
          </div>
          <input type="hidden" {...register("passenger_count", { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">
            Les accompagnants sont autorisés sous conditions d&apos;ordonnance.
          </p>
        </div>
      </div>

      {/* ── Type de véhicule ── */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800">Type de véhicule médical</h3>
        <p className="text-sm text-muted-foreground">
          Sélectionnez le véhicule prescrit par votre médecin ou adapté à vos besoins.
        </p>

        {/* Mismatch warning */}
        {vehicleMismatch && (
          <div
            role="alert"
            className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-sm text-amber-800 font-medium"
          >
            ⚠️ {vehicleMismatch}
          </div>
        )}

        <fieldset>
          <legend className="sr-only">Type de véhicule</legend>
          <div className="space-y-3">
            {vehicleOptions.map(({ value, icon: Icon, title, description, badge, badgeColor, details }) => {
              const isSelected = vehicleType === value;
              const isRecommended = recommended === value;
              return (
                <label
                  key={value}
                  htmlFor={`vehicle-${value}`}
                  className={cn(
                    "flex cursor-pointer gap-4 rounded-2xl border-2 p-4 transition-all relative",
                    isSelected
                      ? "border-brand-blue-500 bg-brand-blue-50/60 shadow-sm"
                      : isRecommended
                      ? "border-brand-green-400 bg-brand-green-50/40 hover:bg-brand-green-50"
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
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isSelected ? "bg-brand-blue-600 text-white" : "bg-gray-100 text-gray-500"
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{title}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", badgeColor)}>
                        {badge}
                      </span>
                      {isRecommended && (
                        <span className="rounded-full bg-brand-green-100 text-brand-green-700 px-2 py-0.5 text-xs font-semibold">
                          ✓ Recommandé
                        </span>
                      )}
                    </div>
                    <p id={`vehicle-desc-${value}`} className="text-sm text-muted-foreground mt-0.5">
                      {description}
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 list-none">
                      {details.map((d) => (
                        <li key={d} className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-gray-400" aria-hidden="true" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-colors",
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

        {errors.vehicle_type && (
          <p role="alert" className="text-sm text-red-600">
            {errors.vehicle_type.message}
          </p>
        )}

        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
          <strong>Besoin d&apos;aide pour choisir&nbsp;?</strong> Le type de véhicule est généralement
          indiqué sur votre prescription médicale (PMT). En cas de doute, appelez le{" "}
          <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-semibold underline">
            {CONTACT_PHONE_DISPLAY}
          </a>.
        </div>
      </div>
    </div>
  );
}
