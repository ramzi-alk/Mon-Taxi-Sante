import { UseFormReturn } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowRight, RefreshCw, Route, Hospital, CalendarIcon, Clock, CalendarRange } from "lucide-react";
import { cn } from "~/lib/utils";
import type { BookingSchema } from "../schema";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "~/components/ui/select";
import { DatePickerField, toDateStr } from "./DatePickerField";
import { computeSeriesDates, summarizeSeries, MAX_SERIES_SESSIONS } from "~/lib/seriesSchedule";

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
] as const;

const SERIES_DURATION_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 16, 20, 26];

interface StepProps {
  form: UseFormReturn<BookingSchema>;
}

const tripOptions = [
  {
    value: "aller_simple" as const,
    icon: ArrowRight,
    title: "Aller simple",
    description: "Un seul trajet, sans retour à organiser.",
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
      "Soins en série (dialyse, radiothérapie, chimiothérapie…). Choisissez vos jours, nous générons automatiquement toutes vos séances.",
  },
];

// Délai par défaut entre l'aller et le retour quand on bascule sur "Aller-retour",
// le temps d'un rendez-vous médical classique — modifiable ensuite par le patient.
const DEFAULT_RETURN_DELAY_MIN = 30;

function addMinutesToTime(time: string, minutes: number): { time: string; dayOffset: number } {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const dayOffset = Math.floor(totalMinutes / (24 * 60));
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
  const mm = String(normalized % 60).padStart(2, "0");
  return { time: `${hh}:${mm}`, dayOffset };
}

export function Step5TripType({ form }: StepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const selected = watch("trip_type");
  const pickupDate = watch("pickup_date");
  const pickupTime = watch("pickup_time");
  const returnDate = watch("return_date");
  const returnTime = watch("return_time");
  const isHospitalization = watch("is_hospitalization");
  const seriesDaysOfWeek = watch("series_days_of_week") ?? [];
  const seriesDurationWeeks = watch("series_duration_weeks");

  // Computed at render time (not module load) so "tomorrow" stays correct
  // even if the form is left open across midnight.
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = toDateStr(minDate);

  // Return trip can't be scheduled before the outbound pickup date.
  const minReturnDate =
    pickupDate && pickupDate > minDateStr ? parseISO(pickupDate) : minDate;

  // Jour de la semaine de la 1ère séance — toujours inclus dans la série,
  // verrouillé dans le sélecteur de jours ci-dessous.
  const anchorDayOfWeek = pickupDate ? parseISO(pickupDate).getDay() : null;

  function toggleSeriesDay(day: number) {
    if (day === anchorDayOfWeek) return;
    const next = seriesDaysOfWeek.includes(day)
      ? seriesDaysOfWeek.filter((d) => d !== day)
      : [...seriesDaysOfWeek, day].sort();
    setValue("series_days_of_week", next, { shouldValidate: true });
  }

  const seriesPreviewDates =
    pickupDate && seriesDaysOfWeek.length > 0 && seriesDurationWeeks
      ? computeSeriesDates(pickupDate, seriesDaysOfWeek, seriesDurationWeeks)
      : [];
  const seriesSummary = summarizeSeries(seriesPreviewDates);

  // Les soins répétés sont automatiquement considérés comme hospitalisations
  function handleTripTypeChange(value: typeof selected) {
    setValue("trip_type", value);
    if (value === "aller_simple") setValue("has_return", false);
    // Soins en série → retour à vide automatique + planning pré-rempli
    // pour éviter toute saisie manuelle superflue
    if (value === "multiple") {
      setValue("is_hospitalization", true);
      if (pickupDate) {
        const anchorDow = parseISO(pickupDate).getDay();
        if (!seriesDaysOfWeek.includes(anchorDow)) {
          setValue("series_days_of_week", [...seriesDaysOfWeek, anchorDow].sort(), {
            shouldValidate: true,
          });
        }
      }
      if (!seriesDurationWeeks) {
        setValue("series_duration_weeks", 4, { shouldValidate: true });
      }
    }

    if (value === "aller_retour") {
      setValue("has_return", true);
      setValue("is_hospitalization", false);

      // Pré-remplit le retour avec l'aller + 30 min (modifiable), pour éviter
      // de forcer une saisie manuelle quand rien n'a encore été choisi.
      let defaultReturnDate = returnDate;
      if (!returnTime && pickupTime) {
        const { time, dayOffset } = addMinutesToTime(pickupTime, DEFAULT_RETURN_DELAY_MIN);
        setValue("return_time", time, { shouldValidate: true });
        if (!defaultReturnDate && pickupDate) {
          const base = parseISO(pickupDate);
          base.setDate(base.getDate() + dayOffset);
          defaultReturnDate = toDateStr(base);
        }
      }
      if (!defaultReturnDate && pickupDate) {
        defaultReturnDate = pickupDate;
      }
      if (defaultReturnDate && defaultReturnDate !== returnDate) {
        setValue("return_date", defaultReturnDate, { shouldValidate: true });
      }
    }
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
              <div
                key={value}
                className={cn(
                  "rounded-2xl border-2 transition-all",
                  isSelected
                    ? "border-brand-blue-500 bg-brand-blue-50/60 shadow-sm"
                    : "border-gray-200 bg-white hover:border-brand-blue-200"
                )}
              >
                <label
                  htmlFor={`trip-${value}`}
                  className="flex cursor-pointer items-start gap-4 p-5"
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

                {/* Précision hospitalisation, accolée directement à "Aller simple" */}
                {value === "aller_simple" && isSelected && (
                  <div className="border-t border-brand-blue-100 px-5 py-4">
                    <label
                      htmlFor="is_hospitalization"
                      className="flex items-start gap-3 cursor-pointer"
                    >
                      <Checkbox
                        id="is_hospitalization"
                        className="mt-0.5"
                        checked={isHospitalization}
                        onCheckedChange={(checked) =>
                          setValue("is_hospitalization", checked === true)
                        }
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
                          Cochez cette case si le patient est admis et reste à l&apos;hôpital à
                          l&apos;issue du transport.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Date/heure de retour — visible uniquement pour aller-retour */}
      {selected === "aller_retour" && (
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

      {/* Planning de la série — visible uniquement pour trajets multiples */}
      {selected === "multiple" && (
        <div className="space-y-5 rounded-xl bg-gray-50 p-3 sm:p-4 border border-gray-200">
          <p className="text-sm font-semibold text-gray-700">Planning de la série</p>

          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-700">
              Jours des séances <span className="text-red-500" aria-hidden="true">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(({ value, label }) => {
                const isChecked = seriesDaysOfWeek.includes(value);
                const isLocked = value === anchorDayOfWeek;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleSeriesDay(value)}
                    disabled={isLocked}
                    aria-pressed={isChecked}
                    aria-label={isLocked ? `${label} (jour de la 1ère séance, inclus automatiquement)` : label}
                    className={cn(
                      "h-11 w-11 rounded-xl border-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isChecked
                        ? "border-brand-blue-600 bg-brand-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-brand-blue-200",
                      isLocked && "cursor-not-allowed opacity-90"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {pickupDate && (
              <p className="text-xs text-muted-foreground">
                Le jour de votre 1ère séance ({format(parseISO(pickupDate), "EEEE", { locale: fr })}) est inclus
                automatiquement.
              </p>
            )}
            {errors.series_days_of_week && (
              <p role="alert" className="text-sm text-red-600">
                {errors.series_days_of_week.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="series_duration_weeks"
              className="text-sm font-semibold text-gray-700"
            >
              Durée du traitement <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <Select
              value={seriesDurationWeeks ? String(seriesDurationWeeks) : undefined}
              onValueChange={(v) =>
                setValue("series_duration_weeks", Number(v), { shouldValidate: true })
              }
            >
              <SelectTrigger id="series_duration_weeks" aria-invalid={!!errors.series_duration_weeks}>
                <SelectValue placeholder="Choisir une durée" />
              </SelectTrigger>
              <SelectContent>
                {SERIES_DURATION_OPTIONS.map((weeks) => (
                  <SelectItem key={weeks} value={String(weeks)}>
                    {weeks} semaine{weeks > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.series_duration_weeks && (
              <p role="alert" className="text-sm text-red-600">
                {errors.series_duration_weeks.message}
              </p>
            )}
          </div>

          {seriesSummary.count > 0 && seriesSummary.firstDate && seriesSummary.lastDate && (
            <div className="flex items-start gap-3 rounded-lg bg-brand-blue-50 border border-brand-blue-100 px-4 py-3">
              <CalendarRange className="h-4 w-4 text-brand-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-brand-blue-900">
                  {seriesSummary.count} séance{seriesSummary.count > 1 ? "s" : ""} planifiée
                  {seriesSummary.count > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-brand-blue-700 mt-0.5">
                  Du {format(parseISO(seriesSummary.firstDate), "d MMMM yyyy", { locale: fr })} au{" "}
                  {format(parseISO(seriesSummary.lastDate), "d MMMM yyyy", { locale: fr })}
                </p>
                {seriesSummary.count > MAX_SERIES_SESSIONS && (
                  <p className="text-xs text-red-600 mt-1">
                    Maximum {MAX_SERIES_SESSIONS} séances par série&nbsp;: réduisez la durée ou le nombre de
                    jours.
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Une réservation distincte est créée et transmise aux chauffeurs pour chaque séance — vous pourrez
            suivre, modifier ou annuler chacune individuellement depuis « Mes réservations ». La génération
            automatique de l&apos;ensemble des séances nécessite votre prescription médicale de transport
            (étape suivante) ; sans elle, seule votre 1ère séance sera enregistrée.
          </p>
        </div>
      )}

      {errors.trip_type && (
        <p role="alert" className="text-sm text-red-600">{errors.trip_type.message}</p>
      )}

    </div>
  );
}
