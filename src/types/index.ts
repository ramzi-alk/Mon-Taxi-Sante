// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = "patient" | "driver" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ─── Driver ─────────────────────────────────────────────────────────────────

export type VehicleType = "taxi" | "vsl" | "ambulance";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "cancelled";

export interface DriverDetails {
  id: string;
  profile_id: string;
  siret: string;
  company_name: string | null;
  convention_cpam: boolean;
  convention_number: string | null;
  vehicle_type: VehicleType;
  vehicle_registration: string;
  pmr_equipped: boolean;
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
  approved_at: string | null;
  created_at: string;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export type BookingStatus =
  | "draft"
  | "pending"
  | "confirmed"
  | "available"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "expired";

export type TripType = "aller_simple" | "aller_retour" | "multiple";
export type CpamStatus = "ald" | "cmu" | "css" | "standard" | "none";
export type BookingVehicleType = "taxi" | "vsl" | "pmr";

export interface Booking {
  id: string;
  patient_id: string;
  driver_id: string | null;
  // Step 1 – Identity
  patient_full_name: string;
  patient_phone: string;
  patient_birth_date: string | null;
  // Step 2 – Route
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  // Step 3 – Date/Time
  pickup_datetime: string;
  return_datetime: string | null;
  // Step 4 – Vehicle
  vehicle_type: BookingVehicleType;
  // Step 5 – Trip type
  trip_type: TripType;
  // Step 6 – Specificities
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  passenger_count: number;
  // Step 7 – CPAM
  cpam_status: CpamStatus;
  mutual_name: string | null;
  // Step 8 – PMT
  pmt_declared: boolean;
  pmt_file_url: string | null;
  // Step 9 – Notes
  medical_notes: string | null;
  // Step 10 – Consent
  consent_accepted_at: string | null;
  // Computed
  estimated_price: number | null;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

// ─── Booking Form State ──────────────────────────────────────────────────────

export interface BookingFormData {
  // Step 1
  patient_full_name: string;
  patient_phone: string;
  patient_birth_date: string;
  // Step 2
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  // Step 3
  pickup_date: string;
  pickup_time: string;
  has_return: boolean;
  return_date: string;
  return_time: string;
  // Step 4
  vehicle_type: BookingVehicleType;
  // Step 5
  trip_type: TripType;
  // Step 6
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  passenger_count: number;
  // Step 7
  cpam_status: CpamStatus;
  mutual_name: string;
  // Step 8
  pmt_declared: boolean;
  pmt_file: File | null;
  // Step 9
  medical_notes: string;
}

// ─── Local SEO ───────────────────────────────────────────────────────────────

export interface LocalPageData {
  department: string;
  departmentCode: string;
  city: string;
  citySlug: string;
  population?: number;
  nearbyHospitals?: string[];
  nearbyClinicNames?: string[];
}

// ─── Blog ────────────────────────────────────────────────────────────────────

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  published_at: string;
  tags: string[];
  reading_time_minutes: number;
}
