import { UseFormReturn } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { User, Phone, CalendarIcon } from "lucide-react";
import type { BookingSchema } from "../schema";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

export function Step1Identity({ form }: StepProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const birthDate = watch("patient_birth_date");
  const today = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Informations du patient
        </h2>
        <p className="mt-1 text-muted-foreground">
          Ces informations permettent au chauffeur de vous identifier à la prise en charge.
        </p>
      </div>

      {/* Full name */}
      <div className="space-y-1.5">
        <label
          htmlFor="patient_full_name"
          className="block text-sm font-semibold text-gray-700"
        >
          Nom complet du patient{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <User
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="patient_full_name"
            type="text"
            autoComplete="name"
            placeholder="Ex : Marie Dupont"
            aria-required="true"
            aria-describedby={errors.patient_full_name ? "name-error" : undefined}
            {...register("patient_full_name")}
            className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-red-500"
            aria-invalid={!!errors.patient_full_name}
          />
        </div>
        {errors.patient_full_name && (
          <p id="name-error" role="alert" className="text-sm text-red-600">
            {errors.patient_full_name.message}
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label
          htmlFor="patient_phone"
          className="block text-sm font-semibold text-gray-700"
        >
          Numéro de téléphone{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <Phone
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="patient_phone"
            type="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
            aria-required="true"
            aria-describedby={errors.patient_phone ? "phone-error" : "phone-hint"}
            {...register("patient_phone")}
            className="w-full rounded-xl border border-input bg-white pl-11 pr-4 py-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={!!errors.patient_phone}
          />
        </div>
        <p id="phone-hint" className="text-xs text-muted-foreground">
          Utilisé pour la confirmation de la réservation et le contact chauffeur.
        </p>
        {errors.patient_phone && (
          <p id="phone-error" role="alert" className="text-sm text-red-600">
            {errors.patient_phone.message}
          </p>
        )}
      </div>

      {/* Birth date */}
      <div className="space-y-1.5">
        <label
          htmlFor="patient_birth_date"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Date de naissance{" "}
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
          Peut être requise pour certains types de prise en charge Assurance Maladie.
        </p>
      </div>

      {/* Privacy notice */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
        <strong>Protection de vos données&nbsp;:</strong> Ces informations sont
        chiffrées et stockées sur un hébergement de données de santé certifié HDS,
        conformément au RGPD. Elles ne sont jamais revendues.
      </div>
    </div>
  );
}
