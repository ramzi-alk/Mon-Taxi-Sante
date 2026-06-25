// Auto-generate this file with: npx supabase gen types typescript --local
// This is a typed stub — replace with generated output after running migrations.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          phone: string | null;
          role: "patient" | "driver" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      drivers_details: {
        Row: {
          id: string;
          profile_id: string;
          siret: string;
          company_name: string | null;
          convention_cpam: boolean;
          convention_number: string | null;
          vehicle_type: "taxi" | "vsl" | "ambulance";
          vehicle_registration: string;
          pmr_equipped: boolean;
          subscription_status: "trial" | "active" | "past_due" | "cancelled";
          subscription_ends_at: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["drivers_details"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["drivers_details"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          patient_id: string;
          driver_id: string | null;
          patient_full_name: string;
          patient_phone: string;
          patient_birth_date: string | null;
          pickup_address: string;
          pickup_lat: number | null;
          pickup_lng: number | null;
          dropoff_address: string;
          dropoff_lat: number | null;
          dropoff_lng: number | null;
          distance_km: number | null;
          pickup_datetime: string;
          return_datetime: string | null;
          vehicle_type: "taxi" | "vsl" | "pmr";
          trip_type: "aller_simple" | "aller_retour" | "multiple";
          requires_wheelchair: boolean;
          requires_stretcher: boolean;
          requires_oxygen: boolean;
          passenger_count: number;
          cpam_status: "ald" | "cmu" | "css" | "standard" | "none";
          mutual_name: string | null;
          pmt_declared: boolean;
          pmt_file_url: string | null;
          medical_notes: string | null;
          consent_accepted_at: string | null;
          estimated_price: number | null;
          status: "draft" | "pending" | "confirmed" | "available" | "accepted" | "in_progress" | "completed" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "patient" | "driver" | "admin";
      vehicle_type: "taxi" | "vsl" | "ambulance";
      booking_vehicle_type: "taxi" | "vsl" | "pmr";
      booking_status: "draft" | "pending" | "confirmed" | "available" | "accepted" | "in_progress" | "completed" | "cancelled";
      trip_type: "aller_simple" | "aller_retour" | "multiple";
      cpam_status: "ald" | "cmu" | "css" | "standard" | "none";
      subscription_status: "trial" | "active" | "past_due" | "cancelled";
    };
  };
}
