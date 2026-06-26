import { UseFormReturn } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock, RefreshCw } from "lucide-react";
import type { BookingSchema } from "../schema";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

function toDateStr(date: Date) {
  return format(date, "yyyy-MM-dd");
}

interface DatePickerFieldProps {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  disabledBefore: Date;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}

function DatePickerField({
  id,
  value,
  onChange,
  disabledBefore,
  placeholder = "Choisir une date",
  invalid,
  describedBy,
}: DatePickerFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(
            "h-auto w-full justify-start rounded-xl px-4 py-3.5 text-left text-base font-normal",
            invalid && "border-red-500",
            !value && "text-muted-foreground"
          )}
        >
          {value
            ? format(parseISO(value), "EEEE d MMMM yyyy", { locale: fr })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          autoFocus
          locale={fr}
          selected={value ? parseISO(value) : undefined}
          onSelect={(date) => date && onChange(toDateStr(date))}
          disabled={{ before: disabledBefore }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function Step3DateTime({ form }: StepProps) {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const hasReturn = watch("has_return");
  const tripType = watch("trip_type");
  const pickupDate = watch("pickup_date");
  const returnDate = watch("return_date");
  const isReturnTrip = hasReturn || tripType === "aller_retour";

  // Computed at render time (not module load) so "tomorrow" stays correct
  // even if the form is left open across midnight.
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // At least tomorrow
  const minDateStr = toDateStr(minDate);

  // Return trip can't be scheduled before the outbound pickup date.
  const minReturnDate =
    pickupDate && pickupDate > minDateStr ? parseISO(pickupDate) : minDate;

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

      {/* Return trip toggle */}
      <div className="rounded-xl border border-brand-blue-100 bg-brand-blue-50 p-4">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              id="has_return"
              {...register("has_return")}
              className="sr-only peer"
              onChange={(e) => {
                setValue("has_return", e.target.checked);
                if (e.target.checked && tripType === "aller_simple") {
                  setValue("trip_type", "aller_retour");
                }
              }}
            />
            <div className="w-11 h-6 rounded-full bg-gray-200 peer-checked:bg-brand-blue-600 transition-colors" aria-hidden="true" />
            <div className="absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" aria-hidden="true" />
          </div>
          <div>
            <span className="font-semibold text-gray-800 flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-brand-blue-600" aria-hidden="true" />
              J&apos;ai besoin d&apos;un trajet retour
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajoutez les informations pour votre retour depuis l&apos;établissement.
            </p>
          </div>
        </label>
      </div>

      {/* Return fields */}
      {isReturnTrip && (
        <div className="space-y-4 rounded-xl bg-gray-50 p-3 sm:p-4 border border-gray-200">
          <p className="text-sm font-semibold text-gray-700">Trajet retour</p>

          <div className="space-y-1.5">
            <label
              htmlFor="return_date"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Date de retour <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <DatePickerField
              id="return_date"
              value={returnDate || undefined}
              onChange={(value) =>
                setValue("return_date", value, { shouldValidate: true })
              }
              disabledBefore={minReturnDate}
              invalid={!!errors.return_date}
              describedBy={errors.return_date ? "return-date-error" : undefined}
            />
            {errors.return_date && (
              <p id="return-date-error" role="alert" className="text-sm text-red-600">
                {errors.return_date.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="return_time"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
            >
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Heure de retour <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <Input
              id="return_time"
              type="time"
              {...register("return_time")}
              className="py-3.5 text-base"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Si vous ne connaissez pas l&apos;heure exacte, vous pourrez la préciser ultérieurement.
          </p>
        </div>
      )}
    </div>
  );
}
