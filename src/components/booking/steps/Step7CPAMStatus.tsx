import { UseFormReturn } from "react-hook-form";
import { ShieldCheck, HelpCircle } from "lucide-react";
import { cn } from "~/lib/utils";
import type { BookingSchema } from "../schema";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

const cpamOptions = [
  {
    value: "ald" as const,
    title: "ALD (Affection de Longue Durée)",
    description:
      "Prise en charge à 100% par l'Assurance Maladie. Cancer, diabète, insuffisance rénale, maladies cardiaques, etc.",
    coverage: "100% pris en charge",
    coverageColor: "text-brand-green-600 bg-brand-green-50",
  },
  {
    value: "cmu" as const,
    title: "CMU-C / CSS",
    description:
      "Complémentaire Santé Solidaire. Prise en charge intégrale pour les personnes aux ressources modestes.",
    coverage: "100% pris en charge",
    coverageColor: "text-brand-green-600 bg-brand-green-50",
  },
  {
    value: "css" as const,
    title: "CSS (Complémentaire Solidaire)",
    description: "Ancienne CMU-C. Accès gratuit ou à tarif réduit aux soins.",
    coverage: "100% pris en charge",
    coverageColor: "text-brand-green-600 bg-brand-green-50",
  },
  {
    value: "standard" as const,
    title: "Assuré standard (mutuelle)",
    description:
      "Remboursement à 65% par l'Assurance Maladie. Votre mutuelle peut prendre en charge le reste.",
    coverage: "65% remboursé (+ mutuelle)",
    coverageColor: "text-brand-blue-600 bg-brand-blue-50",
  },
  {
    value: "none" as const,
    title: "Sans couverture / Frais personnels",
    description: "Transport non prescrit ou hors remboursement CPAM. Paiement direct.",
    coverage: "À votre charge",
    coverageColor: "text-amber-700 bg-amber-50",
  },
] as const;

export function Step7CPAMStatus({ form }: StepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const selected = watch("cpam_status");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Prise en charge Sécurité Sociale
        </h2>
        <p className="mt-1 text-muted-foreground">
          Ces informations nous permettent d&apos;appliquer le bon taux de
          remboursement et de faciliter le Tiers-Payant.
        </p>
      </div>

      {/* Status selector */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-700 mb-3">
          Votre situation de prise en charge{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </legend>
        <div className="space-y-3">
          {cpamOptions.map(({ value, title, description, coverage, coverageColor }) => {
            const isSelected = selected === value;
            return (
              <label
                key={value}
                htmlFor={`cpam-${value}`}
                className={cn(
                  "flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all",
                  isSelected
                    ? "border-brand-blue-500 bg-brand-blue-50/40"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <input
                  type="radio"
                  id={`cpam-${value}`}
                  value={value}
                  checked={isSelected}
                  onChange={() => setValue("cpam_status", value)}
                  className="sr-only"
                />
                <ShieldCheck
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0 transition-colors",
                    isSelected ? "text-brand-blue-600" : "text-gray-300"
                  )}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                  <span className={cn("mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", coverageColor)}>
                    {coverage}
                  </span>
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

      {errors.cpam_status && (
        <p role="alert" className="text-sm text-red-600">{errors.cpam_status.message}</p>
      )}

      {/* Mutual name */}
      <div className="space-y-1.5">
        <label htmlFor="mutual_name" className="block text-sm font-semibold text-gray-700">
          Nom de votre mutuelle{" "}
          <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
        </label>
        <input
          id="mutual_name"
          type="text"
          placeholder="Ex : MGEN, Malakoff Humanis, Harmonie Mutuelle…"
          {...register("mutual_name")}
          className="w-full rounded-xl border border-input bg-white px-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Help block */}
      <div className="flex gap-3 rounded-xl bg-gray-50 border border-gray-200 p-4">
        <HelpCircle className="h-5 w-5 text-brand-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-sm text-gray-700">
          <strong>Pas sûr(e) de votre situation&nbsp;?</strong> Vérifiez votre carte
          Vitale ou demandez à votre médecin. En cas de doute, choisissez
          &ldquo;Assuré standard&rdquo; — nous rectifierons avec votre prescripteur.
        </div>
      </div>
    </div>
  );
}
