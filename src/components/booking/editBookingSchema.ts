import { z } from "zod";

const frenchDate = /^\d{4}-\d{2}-\d{2}$/;

export const editBookingSchema = z
  .object({
    pickup_address: z.string().min(5, "Adresse de départ requise"),
    pickup_lat: z.number().nullable(),
    pickup_lng: z.number().nullable(),
    pickup_municipality: z.string().nullable(),
    dropoff_address: z.string().min(5, "Adresse de destination requise"),
    dropoff_lat: z.number().nullable(),
    dropoff_lng: z.number().nullable(),
    distance_km: z.number().nullable(),
    pickup_date: z.string().regex(frenchDate, "Date de départ invalide"),
    pickup_time: z.string().regex(/^\d{2}:\d{2}$/, "Heure de départ invalide (HH:MM)"),
    has_return: z.boolean(),
    return_date: z.string().optional().or(z.literal("")),
    return_time: z.string().optional().or(z.literal("")),
    vehicle_type: z.enum(["taxi", "vsl", "pmr", "ambulance"]),
    trip_type: z.enum(["aller_simple", "aller_retour", "multiple"]),
    requires_wheelchair: z.boolean(),
    requires_stretcher: z.boolean(),
    requires_oxygen: z.boolean(),
    passenger_count: z.number().int().min(1).max(8),
    cpam_status: z.enum(["ald", "cmu", "css", "standard", "none"]),
    mutual_name: z.string().optional().or(z.literal("")),
    medical_notes: z.string().max(500, "Maximum 500 caractères").optional().or(z.literal("")),
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
  );

export type EditBookingSchema = z.infer<typeof editBookingSchema>;
