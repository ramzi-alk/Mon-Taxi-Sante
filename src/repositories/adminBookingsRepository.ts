import type { SupabaseClient } from "~/lib/supabase";
import type { Database } from "~/lib/database.types";
import { logger } from "~/lib/logger";
import * as storageRepository from "~/repositories/storageRepository";

const PMT_DOCUMENTS_BUCKET = "pmt-documents";

type BookingStatus = Database["public"]["Tables"]["bookings"]["Row"]["status"];
type BookingVehicleType = Database["public"]["Tables"]["bookings"]["Row"]["vehicle_type"];
type BookingTripType = Database["public"]["Tables"]["bookings"]["Row"]["trip_type"];

export interface AdminBookingRow {
  id: string;
  reference_code: string;
  patient_full_name: string;
  patient_phone: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_datetime: string;
  return_datetime: string | null;
  vehicle_type: BookingVehicleType;
  trip_type: BookingTripType;
  series_index: number | null;
  series_total: number | null;
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  status: BookingStatus;
  estimated_price: number | null;
  driver_id: string | null;
  driver: { full_name: string } | null;
}

export interface AdminBookingDetail extends AdminBookingRow {
  patient_email: string | null;
  patient_birth_date: string | null;
  cpam_status: Database["public"]["Tables"]["bookings"]["Row"]["cpam_status"];
  mutual_name: string | null;
  medical_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  passenger_count: number;
  is_hospitalization: boolean;
  booking_for_other: boolean;
  booker_full_name: string | null;
  booker_phone: string | null;
  booker_email: string | null;
  pmt_declared: boolean;
  pmt_file_path: string | null;
}

export interface EligibleDriver {
  profile_id: string;
  full_name: string;
  vehicle_type: Database["public"]["Enums"]["vehicle_type"];
  vehicle_registration: string;
  availability: Database["public"]["Enums"]["driver_availability"];
}

const ADMIN_BOOKING_COLUMNS =
  "id, reference_code, patient_full_name, patient_phone, pickup_address, dropoff_address, pickup_datetime, return_datetime, vehicle_type, trip_type, series_index, series_total, requires_wheelchair, requires_stretcher, requires_oxygen, status, estimated_price, driver_id, driver:profiles!bookings_driver_id_fkey(full_name)";

export interface AdminBookingFilters {
  status?: BookingStatus;
  vehicleType?: BookingVehicleType;
  search?: string;
}

/**
 * Paginated, filterable, searchable listing for /admin/reservations.
 * Admin bypasses the patient/driver-scoped RLS policies via the
 * "bookings: admin all" policy, so this reads the table directly rather
 * than going through get_my_bookings-style RPCs.
 */
export async function fetchBookingsAdmin(
  client: SupabaseClient,
  filters: AdminBookingFilters,
  page: number,
  pageSize: number
): Promise<{ rows: AdminBookingRow[]; total: number }> {
  let query = client
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS, { count: "exact" })
    .order("pickup_datetime", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.vehicleType) query = query.eq("vehicle_type", filters.vehicleType);
  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `reference_code.ilike.%${term}%,patient_full_name.ilike.%${term}%,patient_phone.ilike.%${term}%`
    );
  }

  const from = page * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) {
    logger.error("adminBookings.fetchBookingsAdmin failed", { error: error.message });
    throw new Error(error.message);
  }
  return { rows: (data ?? []) as unknown as AdminBookingRow[], total: count ?? 0 };
}

export async function fetchBookingDetailAdmin(
  client: SupabaseClient,
  bookingId: string
): Promise<AdminBookingDetail | null> {
  const { data, error } = await client
    .from("bookings")
    .select(
      `${ADMIN_BOOKING_COLUMNS}, patient_email, patient_birth_date, cpam_status, mutual_name, medical_notes, cancellation_reason, created_at, accepted_at, picked_up_at, completed_at, passenger_count, is_hospitalization, booking_for_other, booker_full_name, booker_phone, booker_email, pmt_declared, pmt_file_path`
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    logger.error("adminBookings.fetchBookingDetailAdmin failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
  return data as unknown as AdminBookingDetail | null;
}

/**
 * Bookings still unassigned within `hoursThreshold` of pickup — the
 * operational queue that needs a human to step in before a patient is left
 * without a ride to a medical appointment.
 */
export async function fetchAtRiskBookings(
  client: SupabaseClient,
  hoursThreshold: number
): Promise<AdminBookingRow[]> {
  const cutoff = new Date(Date.now() + hoursThreshold * 60 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS)
    .eq("status", "available")
    .lte("pickup_datetime", cutoff)
    .order("pickup_datetime", { ascending: true });

  if (error) {
    logger.error("adminBookings.fetchAtRiskBookings failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as AdminBookingRow[];
}

export async function searchBookingsAdmin(
  client: SupabaseClient,
  term: string
): Promise<AdminBookingRow[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await client
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS)
    .or(`reference_code.ilike.%${trimmed}%,patient_full_name.ilike.%${trimmed}%,patient_phone.ilike.%${trimmed}%`)
    .order("pickup_datetime", { ascending: false })
    .limit(8);

  if (error) {
    logger.error("adminBookings.searchBookingsAdmin failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as AdminBookingRow[];
}

/**
 * Drivers eligible for a given booking: approved, not rejected, and
 * vehicle/equipment-compatible — mirrors the driver_matches_booking SQL
 * function's logic (see migration 018) so the admin picker only offers
 * drivers who could legitimately accept this ride themselves.
 */
export async function fetchEligibleDriversForBooking(
  client: SupabaseClient,
  booking: Pick<AdminBookingRow, "vehicle_type" | "requires_wheelchair" | "requires_stretcher" | "requires_oxygen">
): Promise<EligibleDriver[]> {
  const { data, error } = await client
    .from("drivers_details")
    .select(
      "profile_id, vehicle_type, vehicle_registration, availability, pmr_equipped, stretcher_equipped, oxygen_equipped, profiles:profile_id(full_name)"
    )
    .not("approved_at", "is", null)
    .is("rejected_at", null);

  if (error) {
    logger.error("adminBookings.fetchEligibleDriversForBooking failed", { error: error.message });
    throw new Error(error.message);
  }

  type Row = {
    profile_id: string;
    vehicle_type: Database["public"]["Enums"]["vehicle_type"];
    vehicle_registration: string;
    availability: Database["public"]["Enums"]["driver_availability"];
    pmr_equipped: boolean;
    stretcher_equipped: boolean;
    oxygen_equipped: boolean;
    profiles: { full_name: string } | null;
  };

  const matches = (row: Row): boolean => {
    const vehicleMatches =
      booking.vehicle_type === "taxi"
        ? row.vehicle_type === "taxi"
        : booking.vehicle_type === "vsl"
        ? row.vehicle_type === "vsl" || row.vehicle_type === "ambulance"
        : booking.vehicle_type === "pmr"
        ? row.pmr_equipped
        : false; // "ambulance" bookings: same gap as driver_matches_booking (see migration 018) — never auto-matched today.

    return (
      vehicleMatches &&
      (!booking.requires_wheelchair || row.pmr_equipped) &&
      (!booking.requires_stretcher || row.stretcher_equipped) &&
      (!booking.requires_oxygen || row.oxygen_equipped)
    );
  };

  return ((data ?? []) as unknown as Row[])
    .filter(matches)
    .map((row) => ({
      profile_id: row.profile_id,
      full_name: row.profiles?.full_name ?? "—",
      vehicle_type: row.vehicle_type,
      vehicle_registration: row.vehicle_registration,
      availability: row.availability,
    }))
    .sort((a, b) => (a.availability === "online" ? -1 : 1) - (b.availability === "online" ? -1 : 1));
}

/**
 * Direct table write (admin bypasses restricted RLS via "bookings: admin
 * all") rather than accept_ride, since accept_ride is scoped to the calling
 * driver's own auth.uid() and enforces pool-locking semantics that don't
 * apply to an admin override.
 */
export async function adminAssignDriver(
  client: SupabaseClient,
  bookingId: string,
  driverId: string
): Promise<void> {
  const { error } = await client
    .from("bookings")
    .update({ driver_id: driverId, status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) {
    logger.error("adminBookings.adminAssignDriver failed", { error: error.message, bookingId, driverId });
    throw new Error(error.message);
  }
}

/**
 * Marks a booking as handled by a taxi provider outside the Docteur Taxi
 * network — the admin gives up on finding a network driver and hands the
 * patient off to a third party. Clears any assigned driver, since the ride
 * no longer belongs to the network.
 */
export async function adminMarkExternalProvider(
  client: SupabaseClient,
  bookingId: string
): Promise<void> {
  const { error } = await client
    .from("bookings")
    .update({ status: "external_provider", driver_id: null })
    .eq("id", bookingId);

  if (error) {
    logger.error("adminBookings.adminMarkExternalProvider failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
}

/**
 * Lien signé à courte durée de vie pour consulter le PMT (Prescription
 * Médicale de Transport) d'une réservation — bucket privé, voir la policy
 * "pmt-documents: admin lit tout" (migration 062).
 */
export async function getSignedPmtUrl(client: SupabaseClient, path: string): Promise<string> {
  return storageRepository.createSignedUrl(client, PMT_DOCUMENTS_BUCKET, path);
}

export async function adminCancelBooking(
  client: SupabaseClient,
  bookingId: string,
  reason: string
): Promise<void> {
  const { error } = await client
    .from("bookings")
    .update({ status: "cancelled", cancellation_reason: reason })
    .eq("id", bookingId);

  if (error) {
    logger.error("adminBookings.adminCancelBooking failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
}
