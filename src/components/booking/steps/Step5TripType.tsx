import { UseFormReturn } from "react-hook-form";
import { ArrowRight, RefreshCw, Route, Hospital } from "lucide-react";
import { cn } from "~/lib/utils";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

const tripOptions = [
  {
    value: "aller_simple" as const,
    icon: ArrowRight,
    title: "Aller simple",
    description: "Un seul trajet. Vous repartez par vos propres moyens ou êtes hospitalisé.",
  },
  {
    value: "aller_retour" as const,
    icon: RefreshCw,
    title: "Aller-retour",
    description:
      "Trajet aller et retour dans la même journée. Le chauffeur vous attend ou revient vous chercher.",
  },
  {
    value: "multiple" as const,
    icon: Route,
    title: "Trajets multiples / Série",
    description:
      "Soins en série (dialyse, radiothérapie, chimiothérapie…). Nous planifions l'ensemble de vos séances.",
  },
];

export function Step5TripType({ form }: StepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const selected = watch("trip_type");
  const isHospitalization = watch("is_hospitalization");

  // Les soins répétés sont automatiquement considérés comme hospitalisations
  function handleTripTypeChange(value: typeof selected) {
    setValue("trip_type", value);
    if (value === "aller_retour") setValue("has_return", true);
    if (value === "aller_simple") setValue("has_return", false);
    // Soins en série → retour à vide automatique
    if (value === "multiple") setValue("is_hospitalization", true);
    if (value === "aller_retour") setValue("is_hospitalization", false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Nature du trajet</h2>
        <p className="mt-1 text-muted-foreground">
          Comment se déroule votre transport médical&nbsp;?
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">Nature du trajet</legend>
        <div className="space-y-4">
          {tripOptions.map(({ value, icon: Icon, title, description }) => {
            const isSelected = selected === value;
            return (
              <label
                key={value}
                htmlFor={`trip-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition-all",
                  isSelected
                    ? "border-brand-blue-500 bg-brand-blue-50/60 shadow-sm"
                    : "border-gray-200 bg-white hover:border-brand-blue-200"
                )}
              >
                <input
                  type="radio"
                  id={`trip-${value}`}
                  value={value}
                  checked={isSelected}
                  onChange={() => handleTripTypeChange(value)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    isSelected ? "bg-brand-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                  {value === "multiple" && (
                    <p className="text-xs text-brand-blue-600 font-semibold mt-1">
                      Un conseiller vous contactera pour organiser votre planning.
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5",
                    isSelected ? "border-brand-blue-600 bg-brand-blue-600" : "border-gray-300"
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

      {/* Question hospitalisation — visible uniquement pour aller simple */}
      {selected === "aller_simple" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("is_hospitalization")}
              id="is_hospitalization"
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-blue-600 focus:ring-brand-blue-500 cursor-pointer"
              aria-describedby="hospit-hint"
            />
            <div>
              <div className="flex items-center gap-2">
                <Hospital className="h-4 w-4 text-brand-blue-600 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-gray-800 text-sm">
                  Le patient sera hospitalisé (ne rentre pas le jour même)
                </span>
              </div>
              <p id="hospit-hint" className="text-xs text-muted-foreground mt-1">
                Cochez cette case si le patient est admis et reste à l&apos;hôpital à l&apos;issue du transport.
              </p>
            </div>
          </label>
        </div>
      )}

      {errors.trip_type && (
        <p role="alert" className="text-sm text-red-600">{errors.trip_type.message}</p>
      )}

    </div>
  );
}
