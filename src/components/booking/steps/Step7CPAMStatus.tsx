import { UseFormReturn } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldCheck, HelpCircle, CalendarIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "~/components/ui/accordion";
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
    description:
      "Transport non prescrit ou hors remboursement Assurance Maladie. Le tarif exact vous sera communiqué avant la confirmation de votre réservation — jamais de facturation surprise.",
    coverage: "À votre charge",
    coverageColor: "text-amber-700 bg-amber-50",
  },
] as const;

export function Step7CPAMStatus({ form }: StepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const selected = watch("cpam_status");
  const birthDate = watch("patient_birth_date");
  const today = new Date();

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

      {/* Birth date — demandée ici plutôt qu'à l'étape identité : sa raison
          d'être (vérification ALD/CMU-C/CSS) n'est claire qu'une fois la
          situation de prise en charge affichée. */}
      <div className="space-y-1.5">
        <label
          htmlFor="patient_birth_date"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Date de naissance du patient{" "}
          <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
        </label>
        <input type="hidden" {...register("patient_birth_date")} />
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="patient_birth_date"
              type="button"
              variant="outline"
              aria-describedby="birth-hint"
              className={cn(
                "h-auto w-full justify-start rounded-xl px-4 py-3.5 text-left text-base font-normal",
                !birthDate && "text-muted-foreground"
              )}
            >
              {birthDate
                ? format(parseISO(birthDate), "d MMMM yyyy", { locale: fr })
                : "Choisir une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <Calendar
              mode="single"
              locale={fr}
              selected={birthDate ? parseISO(birthDate) : undefined}
              onSelect={(date) =>
                date &&
                setValue("patient_birth_date", format(date, "yyyy-MM-dd"), {
                  shouldValidate: true,
                })
              }
              disabled={{ after: today }}
              defaultMonth={birthDate ? parseISO(birthDate) : undefined}
              captionLayout="dropdown"
              startMonth={new Date(today.getFullYear() - 120, 0)}
              endMonth={today}
            />
          </PopoverContent>
        </Popover>
        <p id="birth-hint" className="text-xs text-muted-foreground">
          Demandée pour vérifier certains droits ALD, CMU-C ou CSS auprès de l&apos;Assurance Maladie.
        </p>
      </div>

      {/* Mutual name */}
      <div className="space-y-1.5">
        <label htmlFor="mutual_name" className="block text-sm font-semibold text-gray-700">
          Nom de votre mutuelle{" "}
          <span className="text-muted-foreground text-xs font-normal">(optionnel)</span>
        </label>
        <Input
          id="mutual_name"
          type="text"
          placeholder="Ex : MGEN, Malakoff Humanis, Harmonie Mutuelle…"
          {...register("mutual_name")}
          className="py-3.5 text-base"
        />
      </div>

      {/* Help block */}
      <Accordion type="single" collapsible className="rounded-xl bg-gray-50 border border-gray-200 px-4">
        <AccordionItem value="cpam-help">
          <AccordionTrigger className="py-3.5 text-sm text-gray-700">
            <span className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-brand-blue-500 shrink-0" aria-hidden="true" />
              Pas sûr(e) de votre situation&nbsp;?
            </span>
          </AccordionTrigger>
          <AccordionContent className="pl-7 text-sm text-gray-700">
            Vérifiez votre carte Vitale ou demandez à votre médecin. En cas de
            doute, choisissez &ldquo;Assuré standard&rdquo; — nous rectifierons avec
            votre prescripteur.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
