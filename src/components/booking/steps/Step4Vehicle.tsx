import { UseFormReturn } from "react-hook-form";
import { Car, Ambulance, Users } from "lucide-react";
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
    description:
      "Pour les patients pouvant se déplacer de manière autonome. Berline confortable, 1 à 3 passagers.",
    badge: "Le plus courant",
    badgeColor: "bg-brand-blue-100 text-brand-blue-700",
    details: ["Idéal pour consultations ambulatoires", "Confort et discrétion", "Tarif officiel Assurance Maladie"],
  },
  {
    value: "vsl" as const,
    icon: Ambulance,
    title: "VSL (Véhicule Sanitaire Léger)",
    description:
      "Pour les patients nécessitant une aide à la mobilité mais pouvant s'asseoir normalement.",
    badge: "Sur prescription",
    badgeColor: "bg-purple-100 text-purple-700",
    details: ["Chauffeur auxiliaire de santé", "Aide à la montée/descente", "Porte brancard si besoin"],
  },
  {
    value: "pmr" as const,
    icon: Users,
    title: "Taxi PMR (Handicap)",
    description:
      "Véhicule entièrement aménagé pour les fauteuils roulants et personnes à mobilité très réduite.",
    badge: "PMR / Handicap",
    badgeColor: "bg-brand-green-100 text-brand-green-700",
    details: ["Rampe d'accès électrique", "Fixation fauteuil homologuée", "Espace adapté"],
  },
] as const;

export function Step4Vehicle({ form }: StepProps) {
  const {
    watch,
    setValue,
    formState: { errors },
  } = form;

  const selected = watch("vehicle_type");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Type de véhicule médical
        </h2>
        <p className="mt-1 text-muted-foreground">
          Sélectionnez le véhicule prescrit par votre médecin ou adapté à vos besoins.
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">Type de véhicule</legend>
        <div className="space-y-4">
          {vehicleOptions.map(({ value, icon: Icon, title, description, badge, badgeColor, details }) => {
            const isSelected = selected === value;
            return (
              <label
                key={value}
                htmlFor={`vehicle-${value}`}
                className={cn(
                  "flex cursor-pointer gap-4 rounded-2xl border-2 p-5 transition-all",
                  isSelected
                    ? "border-brand-blue-500 bg-brand-blue-50/60 shadow-sm"
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
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                    isSelected ? "bg-brand-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-6 w-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{title}</span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", badgeColor)}>
                      {badge}
                    </span>
                  </div>
                  <p id={`vehicle-desc-${value}`} className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 list-none">
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
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                  )}
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
        <strong>Besoin d&apos;aide pour choisir&nbsp;?</strong> Le type de véhicule est
        généralement indiqué sur votre prescription médicale de transport (PMT). En
        cas de doute, contactez-nous au{" "}
        <a href={`tel:${CONTACT_PHONE_TEL}`} className="font-semibold underline">{CONTACT_PHONE_DISPLAY}</a>.
      </div>
    </div>
  );
}
