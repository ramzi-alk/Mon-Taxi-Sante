import { z } from "zod";
import { computeSeriesDates, MAX_SERIES_SESSIONS } from "~/lib/seriesSchedule";

const frenchPhone = /^(\+33|0)[1-9](\d{2}){4}$/;
const frenchDate = /^\d{4}-\d{2}-\d{2}$/;

export const bookingSchema = z
  .object({
    // Step 1 — Identity
    patient_full_name: z
      .string()
      .min(3, "Veuillez saisir votre nom complet (prénom et nom)"),
    patient_phone: z
      .string()
      .regex(frenchPhone, "Numéro de téléphone français invalide (ex: 06 12 34 56 78)"),
    patient_email: z
      .string()
      .min(1, "Adresse email requise")
      .email("Adresse email invalide"),
    patient_birth_date: z
      .string()
      .regex(frenchDate, "Date de naissance invalide")
      .optional()
      .or(z.literal("")),

    // Step 2 — Route
    pickup_address: z.string().min(5, "Adresse de départ requise"),
    pickup_lat: z.number().nullable(),
    pickup_lng: z.number().nullable(),
    dropoff_address: z.string().min(5, "Adresse de destination requise"),
    dropoff_lat: z.number().nullable(),
    dropoff_lng: z.number().nullable(),
    distance_km: z.number().nullable(),

    // Step 3 — Date/Time
    pickup_date: z.string().regex(frenchDate, "Date de départ invalide"),
    pickup_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Heure de départ invalide (HH:MM)"),
    has_return: z.boolean(),
    return_date: z.string().optional().or(z.literal("")),
    return_time: z.string().optional().or(z.literal("")),

    // Step 4 — Vehicle
    vehicle_type: z.enum(["taxi", "vsl", "pmr"]),

    // Step 5 — Trip type
    trip_type: z.enum(["aller_simple", "aller_retour", "multiple"]),
    // Retour à vide éligible (hospitalisation ou soins répétés) — convention 2025 art. 4
    is_hospitalization: z.boolean(),
    // Jours de la semaine (0 = dimanche ... 6 = samedi, convention Date.getDay())
    // et durée en semaines, utilisés uniquement pour trip_type === "multiple"
    // afin de générer le calendrier des séances.
    series_days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
    series_duration_weeks: z.number().int().min(1).max(26).optional(),

    // Step 6 — Specificities
    requires_wheelchair: z.boolean(),
    requires_stretcher: z.boolean(),
    requires_oxygen: z.boolean(),
    passenger_count: z.number().int().min(1).max(8),

    // Step 7 — CPAM
    cpam_status: z.enum(["ald", "cmu", "css", "standard", "none"]),
    mutual_name: z.string().optional().or(z.literal("")),

    // Step 8 — PMT
    pmt_declared: z.boolean(),
    pmt_file: z.any().optional(),

    // Step 9 — Notes
    medical_notes: z.string().max(500, "Maximum 500 caractères").optional().or(z.literal("")),

    // Step 10 — Consent
    consent: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.has_return || data.trip_type === "aller_retour") {
        return !!data.return_date && !!data.return_time;
      }
      return true;
    },
    {
      message: "La date et l'heure de retour sont requises pour un aller-retour",
      path: ["return_date"],
    }
  )
  .refine(
    (data) => {
      if (data.return_date) {
        return data.return_date >= data.pickup_date;
      }
      return true;
    },
    {
      message: "La date de retour doit être postérieure ou égale à la date de départ",
      path: ["return_date"],
    }
  )
  .refine(
    (data) => {
      if (data.trip_type === "multiple") {
        return !!data.series_days_of_week && data.series_days_of_week.length > 0;
      }
      return true;
    },
    {
      message: "Sélectionnez au moins un jour de la semaine pour la série de soins",
      path: ["series_days_of_week"],
    }
  )
  .refine(
    (data) => {
      if (data.trip_type === "multiple") {
        return !!data.series_duration_weeks && data.series_duration_weeks >= 1;
      }
      return true;
    },
    {
      message: "Indiquez la durée de la série de soins",
      path: ["series_duration_weeks"],
    }
  )
  .refine(
    (data) => {
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
    {
      message: `Trop de séances (maximum ${MAX_SERIES_SESSIONS}) : réduisez la durée ou le nombre de jours`,
      path: ["series_duration_weeks"],
    }
  )
  .refine((data) => data.consent === true, {
    message: "Vous devez accepter les CGV et la politique de confidentialité pour continuer",
    path: ["consent"],
  });

export type BookingSchema = z.infer<typeof bookingSchema>;

export const BOOKING_STEPS = [
  { id: 1, title: "Votre identité", shortTitle: "Identité" },
  { id: 2, title: "Adresses de trajet", shortTitle: "Trajet" },
  { id: 3, title: "Date et heure", shortTitle: "Horaire" },
  { id: 4, title: "Type de véhicule", shortTitle: "Véhicule" },
  { id: 5, title: "Nature du trajet", shortTitle: "Nature" },
  { id: 6, title: "Besoins spécifiques", shortTitle: "Besoins" },
  { id: 7, title: "Prise en charge Assurance Maladie", shortTitle: "Assurance Maladie" },
  { id: 8, title: "Prescription médicale", shortTitle: "PMT" },
  { id: 9, title: "Informations complémentaires", shortTitle: "Notes" },
  { id: 10, title: "Récapitulatif & Confirmation", shortTitle: "Confirmation" },
] as const;

export const STEP_FIELDS: Record<number, (keyof BookingSchema)[]> = {
  1: ["patient_full_name", "patient_phone", "patient_email", "patient_birth_date"],
  2: ["pickup_address", "dropoff_address"],
  3: ["pickup_date", "pickup_time"],
  4: ["vehicle_type"],
  5: [
    "trip_type",
    "is_hospitalization",
    "return_date",
    "return_time",
    "series_days_of_week",
    "series_duration_weeks",
  ],
  6: ["passenger_count"],
  7: ["cpam_status"],
  8: ["pmt_declared"],
  9: ["medical_notes"],
  10: ["consent"],
};
