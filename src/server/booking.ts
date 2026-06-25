import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import { logger } from "~/lib/logger";

interface SubmitBookingPayload {
  patient_id: string;
  patient_full_name: string;
  patient_phone: string;
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

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert(data.payload)
      .select("id")
      .single();

    if (error) {
      logger.error("booking.submit failed", {
        error: error.message,
        vehicle_type: data.payload.vehicle_type,
        cpam_status: data.payload.cpam_status,
      });
      throw new Error(error.message);
    }

    return booking;
  });
