import type { SupabaseClient } from "~/lib/supabase";
import type { Database } from "~/lib/database.types";
import { logger } from "~/lib/logger";
import * as storageRepository from "~/repositories/storageRepository";

const PMT_DOCUMENTS_BUCKET = "pmt-documents";

type BookingStatus = Database["public"]["Tables"]["bookings"]["Row"]["status"];
type BookingVehicleType = Database["public"]["Tables"]["bookings"]["Row"]["vehicle_type"];
type BookingTripType = Database["public"]["Tables"]["bookings"]["Row"]["trip_type"];

type CpamStatus = Database["public"]["Tables"]["bookings"]["Row"]["cpam_status"];

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
  series_id: string | null;
  series_index: number | null;
  series_total: number | null;
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  status: BookingStatus;
  estimated_price: number | null;
  driver_id: string | null;
  driver: { full_name: string } | null;
  cpam_status: CpamStatus;
  mutual_name: string | null;
  pmt_declared: boolean;
  reminder_sent_at: string | null;
  reminder_confirmed_at: string | null;
}

export interface AdminBookingDetail extends AdminBookingRow {
  patient_email: string | null;
  patient_birth_date: string | null;
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
  "id, reference_code, patient_full_name, patient_phone, pickup_address, dropoff_address, pickup_datetime, return_datetime, vehicle_type, trip_type, series_id, series_index, series_total, requires_wheelchair, requires_stretcher, requires_oxygen, status, estimated_price, driver_id, driver:profiles!bookings_driver_id_fkey(full_name), cpam_status, mutual_name, pmt_declared, reminder_sent_at, reminder_confirmed_at";

export interface AdminBookingFilters {
  status?: BookingStatus;
  vehicleType?: BookingVehicleType;
  search?: string;
  driverId?: string;
  cpamStatus?: CpamStatus;
  seriesId?: string;
  /** ISO timestamps — used for both the date-range filter and, computed
   * by the caller, the "at risk" / "reminder pending" quick filters. */
  pickupFrom?: string;
  pickupTo?: string;
  /** Insurance coverage declared but no PMT file on record yet. */
  missingPmt?: boolean;
  reminderPending?: boolean;
}

// Shared between the paginated list and the unpaginated CSV export so the
// two stay in sync as filters are added. Typed as `any` because the
// Postgrest query builder's generics change shape after every chained
// call (.eq, .or, ...), which makes a precise type impractical to keep in
// sync here — both call sites still get a fully-typed builder back.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBookingFilters(query: any, filters: AdminBookingFilters): any {
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.vehicleType) query = query.eq("vehicle_type", filters.vehicleType);
  if (filters.driverId) query = query.eq("driver_id", filters.driverId);
  if (filters.cpamStatus) query = query.eq("cpam_status", filters.cpamStatus);
  if (filters.seriesId) query = query.eq("series_id", filters.seriesId);
  if (filters.pickupFrom) query = query.gte("pickup_datetime", filters.pickupFrom);
  if (filters.pickupTo) query = query.lte("pickup_datetime", filters.pickupTo);
  if (filters.missingPmt) query = query.neq("cpam_status", "none").eq("pmt_declared", false);
  if (filters.reminderPending) query = query.is("reminder_sent_at", null);
  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `reference_code.ilike.%${term}%,patient_full_name.ilike.%${term}%,patient_phone.ilike.%${term}%`
    );
  }
  return query;
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
  pageSize: number,
  sortDirection: "asc" | "desc" = "desc"
): Promise<{ rows: AdminBookingRow[]; total: number }> {
  let query = client
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS, { count: "exact" })
    .order("pickup_datetime", { ascending: sortDirection === "asc" });

  query = applyBookingFilters(query, filters);

  const from = page * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) {
    logger.error("adminBookings.fetchBookingsAdmin failed", { error: error.message });
    throw new Error(error.message);
  }
  return { rows: (data ?? []) as unknown as AdminBookingRow[], total: count ?? 0 };
}

const EXPORT_ROW_LIMIT = 2000;

/**
 * Unpaginated variant of fetchBookingsAdmin for the CSV export — same
 * filters, capped at EXPORT_ROW_LIMIT rows as a safety net.
 */
export async function fetchBookingsForExport(
  client: SupabaseClient,
  filters: AdminBookingFilters
): Promise<AdminBookingRow[]> {
  let query = client
    .from("bookings")
    .select(ADMIN_BOOKING_COLUMNS)
    .order("pickup_datetime", { ascending: false })
    .limit(EXPORT_ROW_LIMIT);

  query = applyBookingFilters(query, filters);

  const { data, error } = await query;
  if (error) {
    logger.error("adminBookings.fetchBookingsForExport failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as AdminBookingRow[];
}

export interface AdminBookingsKpis {
  today: number;
  unassigned: number;
  atRisk: number;
  /** Share of bookings created in the last 30 days that were cancelled, 0-100. */
  cancellationRate30d: number;
}

/**
 * Headline counters shown above the reservations table. Kept as cheap
 * head:true/count:exact queries rather than pulling rows, and grouped
 * under the queryKey ["admin-bookings", "kpis"] so the existing
 * `useRealtime({queryKey:["admin-bookings"]})` subscription also refreshes
 * them on any booking change.
 */
export async function fetchBookingsKpis(
  client: SupabaseClient,
  atRiskHours: number
): Promise<AdminBookingsKpis> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const atRiskCutoff = new Date(now.getTime() + atRiskHours * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [today, unassigned, atRisk, period, cancelled] = await Promise.all([
    client.from("bookings").select("id", { count: "exact", head: true }).gte("pickup_datetime", todayStart).lt("pickup_datetime", todayEnd),
    client.from("bookings").select("id", { count: "exact", head: true }).eq("status", "available"),
    client.from("bookings").select("id", { count: "exact", head: true }).eq("status", "available").lte("pickup_datetime", atRiskCutoff),
    client.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    client.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo).eq("status", "cancelled"),
  ]);

  for (const result of [today, unassigned, atRisk, period, cancelled]) {
    if (result.error) {
      logger.error("adminBookings.fetchBookingsKpis failed", { error: result.error.message });
      throw new Error(result.error.message);
    }
  }

  const totalPeriod = period.count ?? 0;
  const cancelledPeriod = cancelled.count ?? 0;

  return {
    today: today.count ?? 0,
    unassigned: unassigned.count ?? 0,
    atRisk: atRisk.count ?? 0,
    cancellationRate30d: totalPeriod > 0 ? Math.round((cancelledPeriod / totalPeriod) * 1000) / 10 : 0,
  };
}

export interface DriverFilterOption {
  profile_id: string;
  full_name: string;
}

/**
 * Approved drivers for the admin filter dropdown — same eligibility gate
 * (approved, not rejected) as fetchEligibleDriversForBooking, but without
 * the per-booking vehicle/equipment matching since this list isn't tied to
 * one specific ride.
 */
export async function fetchDriversForFilter(client: SupabaseClient): Promise<DriverFilterOption[]> {
  const { data, error } = await client
    .from("drivers_details")
    .select("profile_id, profiles:profile_id(full_name)")
    .not("approved_at", "is", null)
    .is("rejected_at", null);

  if (error) {
    logger.error("adminBookings.fetchDriversForFilter failed", { error: error.message });
    throw new Error(error.message);
  }

  type Row = { profile_id: string; profiles: { full_name: string } | null };
  return ((data ?? []) as unknown as Row[])
    .map((row) => ({ profile_id: row.profile_id, full_name: row.profiles?.full_name ?? "—" }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "fr"));
}

export async function fetchBookingDetailAdmin(
  client: SupabaseClient,
  bookingId: string
): Promise<AdminBookingDetail | null> {
  const { data, error } = await client
    .from("bookings")
    .select(
      `${ADMIN_BOOKING_COLUMNS}, patient_email, patient_birth_date, medical_notes, cancellation_reason, created_at, accepted_at, picked_up_at, completed_at, passenger_count, is_hospitalization, booking_for_other, booker_full_name, booker_phone, booker_email, pmt_file_path`
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
