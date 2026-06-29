import { UseFormReturn } from "react-hook-form";
import { CalendarIcon, Clock } from "lucide-react";
import type { BookingSchema } from "../schema";
import { Input } from "~/components/ui/input";
import { DatePickerField } from "./DatePickerField";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

export function Step3DateTime({ form }: StepProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const pickupDate = watch("pickup_date");

  // Computed at render time (not module load) so "tomorrow" stays correct
  // even if the form is left open across midnight.
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // At least tomorrow

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Date et heure du trajet</h2>
        <p className="mt-1 text-muted-foreground">
          Les réservations doivent être effectuées au moins 24h à l&apos;avance.
        </p>
      </div>

      {/* Date */}
      <div className="space-y-1.5">
        <label
          htmlFor="pickup_date"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Date du rendez-vous{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <DatePickerField
          id="pickup_date"
          value={pickupDate}
          onChange={(value) =>
            setValue("pickup_date", value, { shouldValidate: true })
          }
          disabledBefore={minDate}
          invalid={!!errors.pickup_date}
          describedBy={errors.pickup_date ? "date-error" : undefined}
        />
        {errors.pickup_date && (
          <p id="date-error" role="alert" className="text-sm text-red-600">
            {errors.pickup_date.message}
          </p>
        )}
      </div>

      {/* Time */}
      <div className="space-y-1.5">
        <label
          htmlFor="pickup_time"
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
        >
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Heure de prise en charge{" "}
          <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <Input
          id="pickup_time"
          type="time"
          aria-required="true"
          aria-describedby="time-hint"
          {...register("pickup_time")}
          className="py-3.5 text-base"
        />
        <p id="time-hint" className="text-xs text-muted-foreground">
          Prévoyez une marge de 30 minutes avant votre rendez-vous.
        </p>
      </div>
    </div>
  );
}
