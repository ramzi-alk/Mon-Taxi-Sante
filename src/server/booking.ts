import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import * as profilesRepository from "~/repositories/profilesRepository";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { sendBookingConfirmationEmail } from "./email";

interface SubmitBookingPayload {
  patient_id: string;
  patient_full_name: string;
  patient_phone: string;
  patient_email: string;
  patient_birth_date: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_datetime: string;
  return_datetime: string | null;
  vehicle_type: Database["public"]["Tables"]["bookings"]["Row"]["vehicle_type"];
  trip_type: Database["public"]["Tables"]["bookings"]["Row"]["trip_type"];
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  passenger_count: number;
  cpam_status: Database["public"]["Tables"]["bookings"]["Row"]["cpam_status"];
  mutual_name: string | null;
  pmt_declared: boolean;
  pmt_file_url: string | null;
  medical_notes: string | null;
  consent_accepted_at: string;
  status: Database["public"]["Tables"]["bookings"]["Row"]["status"];
}

interface SubmitBookingInput {
  accessToken: string;
  payload: SubmitBookingPayload;
}

export const submitBookingServerFn = createServerFn({ method: "POST" })
  .validator((input: SubmitBookingInput) => input)
  .handler(async ({ data }) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false },
    });

    // bookings.patient_id is a NOT NULL FK to profiles — self-heal a missing
    // profile row (same known trigger-reliability issue as driver signups,
    // see migration 017) before inserting, instead of letting the FK
    // violation surface to the patient mid-booking.
    const admin = getSupabaseAdminClient();
    const profile = await profilesRepository.ensureProfile(admin, data.payload.patient_id);
    if (!profile) {
      throw new Error("Impossible de finaliser la réservation (profil introuvable). Réessayez.");
    }

    const booking = await bookingsRepository.insertBooking(supabase, data.payload);

    await sendBookingConfirmationEmail({
      to: data.payload.patient_email,
      patientFullName: data.payload.patient_full_name,
      referenceCode: booking.reference_code,
      pickupAddress: data.payload.pickup_address,
      dropoffAddress: data.payload.dropoff_address,
      pickupDatetime: data.payload.pickup_datetime,
    });

    return booking;
  });
