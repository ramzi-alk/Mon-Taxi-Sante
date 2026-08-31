import { z } from "zod";
import type { FieldName, Resolver, ResolverResult } from "react-hook-form";
import { toNestErrors, validateFieldsNatively } from "@hookform/resolvers";
import { computeSeriesDates, MAX_SERIES_SESSIONS } from "~/lib/seriesSchedule";

const frenchPhone = /^(\+33|0)[1-9](\d{2}){4}$/;
const frenchDate = /^\d{4}-\d{2}-\d{2}$/;

// Per-field validation only — no cross-field rules. Kept separate from the
// .refine() chain below so the booking form's resolver (bookingResolver,
// further down) can skip individual cross-field checks that aren't part of
// the step currently being validated, instead of re-running all of them
// (including a computeSeriesDates() call) on every trigger() during
// navigation.
export const bookingObjectSchema = z.object({
    // Identity
    // Who is booking
    booking_for_other: z.boolean(),
    // Patient (the person who will travel)
    patient_full_name: z
      .string()
      .min(3, "Veuillez saisir le nom complet du patient (prénom et nom)"),
    patient_phone: z
      .string()
      .regex(frenchPhone, "Numéro de téléphone français invalide (ex: 06 12 34 56 78)"),
    patient_email: z
      .string()
      .email("Adresse email invalide")
      .or(z.literal("")),
    patient_birth_date: z
      .string()
      .regex(frenchDate, "Date de naissance invalide")
      .optional()
      .or(z.literal("")),
    // Booker (the person placing the reservation, when different from the patient)
    booker_full_name: z.string().optional().or(z.literal("")),
    booker_phone: z.string().optional().or(z.literal("")),
    booker_email: z.string().optional().or(z.literal("")),

    // Route
    pickup_address: z.string().min(5, "Adresse de départ requise"),
    pickup_lat: z.number().nullable(),
    pickup_lng: z.number().nullable(),
    // Commune de départ (sans le numéro/nom de rue) — affichée aux chauffeurs
    // à la place de pickup_address tant que la course n'est pas acceptée.
    pickup_municipality: z.string().nullable(),
    dropoff_address: z.string().min(5, "Adresse de destination requise"),
    dropoff_lat: z.number().nullable(),
    dropoff_lng: z.number().nullable(),
    dropoff_municipality: z.string().nullable(),
    distance_km: z.number().nullable(),

    // Date/Time
    pickup_date: z.string().regex(frenchDate, "Date de départ invalide"),
    pickup_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Heure de départ invalide (HH:MM)"),
    has_return: z.boolean(),
    return_date: z.string().optional().or(z.literal("")),
    return_time: z.string().optional().or(z.literal("")),

    // Vehicle
    vehicle_type: z.enum(["taxi", "vsl", "pmr", "ambulance"]),

    // Trip type
    trip_type: z.enum(["aller_simple", "aller_retour", "multiple"]),
    // Retour à vide éligible (hospitalisation ou soins répétés) — convention 2025 art. 4
    is_hospitalization: z.boolean(),
    // Jours de la semaine (0 = dimanche ... 6 = samedi, convention Date.getDay())
    // et durée en semaines, utilisés uniquement pour trip_type === "multiple"
    // afin de générer le calendrier des séances.
    series_days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    series_duration_weeks: z.number().int().min(1).max(26).optional(),

    // Specificities
    requires_wheelchair: z.boolean(),
    requires_stretcher: z.boolean(),
    requires_oxygen: z.boolean(),
    passenger_count: z.number().int().min(1).max(8),

    // CPAM
    cpam_status: z.enum(["ald", "cmu", "css", "standard", "none"]),
    mutual_name: z.string().optional().or(z.literal("")),

    // PMT
    pmt_declared: z.boolean(),
    pmt_file: z.any().optional(),

    // Notes
    medical_notes: z.string().max(500, "Maximum 500 caractères").optional().or(z.literal("")),

    // Consent
    consent: z.boolean(),
});

export type BookingSchema = z.infer<typeof bookingObjectSchema>;

interface CrossFieldCheck {
  /** Field the error is reported against — also what a trigger() call must request to run this check. */
  path: keyof BookingSchema;
  check: (data: BookingSchema) => boolean;
  message: string;
}

// Cross-field rules, applied via bookingResolver (below) and, chained as
// .refine() calls, via bookingSchema for one-shot use elsewhere (parsing a
// full payload outside the wizard). Order matters: for a given path, the
// first failing check wins, matching react-hook-form's default
// (non-"all") criteriaMode.
const crossFieldChecks: CrossFieldCheck[] = [
  {
    path: "return_date",
    check: (data) => {
      if (data.has_return || data.trip_type === "aller_retour") {
        return !!data.return_date && !!data.return_time;
      }
      return true;
    },
    message: "La date et l'heure de retour sont requises pour un aller-retour",
  },
  {
    path: "return_date",
    check: (data) => {
      if (data.return_date) {
        return data.return_date >= data.pickup_date;
      }
      return true;
    },
    message: "La date de retour doit être postérieure ou égale à la date de départ",
  },
  {
    path: "series_days_of_week",
    check: (data) => {
      if (data.trip_type === "multiple") {
        return !!data.series_days_of_week && data.series_days_of_week.length > 0;
      }
      return true;
    },
    message: "Sélectionnez au moins un jour de la semaine pour la série de soins",
  },
  {
    path: "series_duration_weeks",
    check: (data) => {
      if (data.trip_type === "multiple") {
        return !!data.series_duration_weeks && data.series_duration_weeks >= 1;
      }
      return true;
    },
    message: "Indiquez la durée de la série de soins",
  },
  {
    path: "series_duration_weeks",
    check: (data) => {
      if (data.trip_type === "multiple" && data.series_days_of_week?.length && data.series_duration_weeks) {
        const dates = computeSeriesDates(
          data.pickup_date,
          data.series_days_of_week,
          data.series_duration_weeks
        );
        return dates.length <= MAX_SERIES_SESSIONS;
      }
      return true;
    },
    message: `Trop de séances (maximum ${MAX_SERIES_SESSIONS}) : réduisez la durée ou le nombre de jours`,
  },
  {
    path: "consent",
    check: (data) => data.consent === true,
    message: "Vous devez accepter les CGV et la politique de confidentialité pour continuer",
  },
  {
    path: "booker_email",
    check: (data) => {
      if (data.booking_for_other) {
        return !!data.booker_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.booker_email);
      }
      return true;
    },
    message: "Votre adresse email est requise pour recevoir la confirmation de réservation",
  },
  {
    path: "booker_phone",
    check: (data) => {
      if (data.booking_for_other) {
        return !!data.booker_phone && frenchPhone.test(data.booker_phone);
      }
      return true;
    },
    message: "Votre numéro de téléphone est requis (ex : 06 12 34 56 78)",
  },
];

/** Full schema (object + all cross-field rules) for one-shot validation outside the wizard's step-by-step flow. */
export const bookingSchema: z.ZodType<BookingSchema> = crossFieldChecks.reduce(
  (schema, { check, message, path }) => schema.refine(check, { message, path: [path] }),
  bookingObjectSchema as z.ZodType<BookingSchema>
);

/**
 * react-hook-form resolver for the booking wizard. Behaves like
 * zodResolver(bookingSchema), except a cross-field check only runs when its
 * `path` is among the fields a trigger() call actually requested
 * (options.names) — react-hook-form already discards errors on fields
 * outside that list, so this just skips computing them. On step navigation
 * that means only the 1-2 relevant checks run instead of all nine
 * (including a computeSeriesDates() call) on every field blur; the final,
 * argument-less trigger() in handleSubmit still requests every mounted
 * field, so the full set still runs there as a safety net.
 */
export const bookingResolver: Resolver<BookingSchema> = async (values, _context, options) => {
  const objectResult = bookingObjectSchema.safeParse(values);
  const rawErrors: Partial<Record<string, { type: string; message: string }>> = {};

  if (!objectResult.success) {
    for (const issue of objectResult.error.issues) {
      const path = issue.path.join(".");
      if (!rawErrors[path]) {
        rawErrors[path] = { type: issue.code, message: issue.message };
      }
    }
  }

  const requestedNames = options.names as FieldName<BookingSchema>[] | undefined;
  for (const { path, check, message } of crossFieldChecks) {
    if (rawErrors[path]) continue;
    if (requestedNames && requestedNames.length > 0 && !requestedNames.includes(path)) continue;
    if (!check(values)) {
      rawErrors[path] = { type: "custom", message };
    }
  }

  const hasErrors = Object.keys(rawErrors).length > 0;
  const errors = toNestErrors(rawErrors as Record<string, { type: string; message: string }>, options);

  if (options.shouldUseNativeValidation) {
    validateFieldsNatively(errors, options);
  }

  return (
    hasErrors
      ? { values: {}, errors }
      : { values, errors: {} }
  ) as ResolverResult<BookingSchema>;
};

// Ordre choisi pour limiter la friction : le trajet et le besoin (valeur
// perçue) viennent avant l'identité et les informations administratives, et
// PMT + notes sont regroupées en une seule étape (cf. audit UX sprint 1).
export const BOOKING_STEPS = [
  { id: 1, title: "Adresses de trajet", shortTitle: "Trajet" },
  { id: 2, title: "Date et heure", shortTitle: "Horaire" },
  { id: 3, title: "Véhicule & besoins", shortTitle: "Véhicule" },
  { id: 4, title: "Nature du trajet", shortTitle: "Nature" },
  { id: 5, title: "Votre identité", shortTitle: "Identité" },
  { id: 6, title: "Prise en charge Assurance Maladie", shortTitle: "Assurance Maladie" },
  { id: 7, title: "Prescription médicale & notes", shortTitle: "PMT & Notes" },
  { id: 8, title: "Récapitulatif & Confirmation", shortTitle: "Confirmation" },
] as const;

export const STEP_FIELDS: Record<number, (keyof BookingSchema)[]> = {
  1: ["pickup_address", "dropoff_address"],
  2: ["pickup_date", "pickup_time"],
  3: ["vehicle_type", "requires_wheelchair", "requires_stretcher", "requires_oxygen", "passenger_count"],
  4: [
    "trip_type",
    "is_hospitalization",
    "return_date",
    "return_time",
    "series_days_of_week",
    "series_duration_weeks",
  ],
  5: ["booking_for_other", "patient_full_name", "patient_phone", "patient_email", "booker_full_name", "booker_phone", "booker_email"],
  6: ["cpam_status", "patient_birth_date"],
  7: ["pmt_declared", "pmt_file", "medical_notes"],
  8: ["consent"],
};
