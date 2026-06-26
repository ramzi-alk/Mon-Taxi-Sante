// Auto-generate this file with: npx supabase gen types typescript --local
// This is a typed stub — replace with generated output after running migrations.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface MyBookingFunctionRow {
  id: string;
  reference_code: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_datetime: string;
  return_datetime: string | null;
  vehicle_type: "taxi" | "vsl" | "pmr";
  trip_type: "aller_simple" | "aller_retour" | "multiple";
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  passenger_count: number;
  estimated_price: number | null;
  status: "draft" | "pending" | "confirmed" | "available" | "accepted" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  patient_full_name: string;
  patient_phone: string;
  patient_birth_date: string | null;
  cpam_status: "ald" | "cmu" | "css" | "standard" | "none";
  mutual_name: string | null;
  medical_notes: string | null;
  driver_full_name: string | null;
  driver_phone: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_registration: string | null;
}

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
        Relationships: [];
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
          vehicle_brand: string | null;
          vehicle_model: string | null;
          pmr_equipped: boolean;
          subscription_status: "trial" | "active" | "past_due" | "cancelled";
          subscription_ends_at: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["drivers_details"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["drivers_details"]["Insert"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          reference_code: string;
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
        Insert: Omit<Database["public"]["Tables"]["bookings"]["Row"], "id" | "reference_code" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      lookup_booking_by_reference: {
        Args: { p_reference_code: string; p_phone: string };
        Returns: MyBookingFunctionRow[];
      };
      get_my_bookings: {
        Args: Record<string, never>;
        Returns: MyBookingFunctionRow[];
      };
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string | null };
        Returns: undefined;
      };
      update_booking: {
        Args: {
          p_booking_id: string;
          p_pickup_address: string;
          p_pickup_lat: number | null;
          p_pickup_lng: number | null;
          p_dropoff_address: string;
          p_dropoff_lat: number | null;
          p_dropoff_lng: number | null;
          p_pickup_datetime: string;
          p_return_datetime: string | null;
          p_vehicle_type: "taxi" | "vsl" | "pmr";
          p_trip_type: "aller_simple" | "aller_retour" | "multiple";
          p_requires_wheelchair: boolean;
          p_requires_stretcher: boolean;
          p_requires_oxygen: boolean;
          p_passenger_count: number;
          p_cpam_status: "ald" | "cmu" | "css" | "standard" | "none";
          p_mutual_name: string | null;
          p_medical_notes: string | null;
        };
        Returns: undefined;
      };
      cancel_booking_by_reference: {
        Args: { p_reference_code: string; p_phone: string; p_reason?: string | null };
        Returns: string;
      };
      update_booking_by_reference: {
        Args: {
          p_reference_code: string;
          p_phone: string;
          p_pickup_address: string;
          p_pickup_lat: number | null;
          p_pickup_lng: number | null;
          p_dropoff_address: string;
          p_dropoff_lat: number | null;
          p_dropoff_lng: number | null;
          p_pickup_datetime: string;
          p_return_datetime: string | null;
          p_vehicle_type: "taxi" | "vsl" | "pmr";
          p_trip_type: "aller_simple" | "aller_retour" | "multiple";
          p_requires_wheelchair: boolean;
          p_requires_stretcher: boolean;
          p_requires_oxygen: boolean;
          p_passenger_count: number;
          p_cpam_status: "ald" | "cmu" | "css" | "standard" | "none";
          p_mutual_name: string | null;
          p_medical_notes: string | null;
        };
        Returns: string;
      };
    };
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
