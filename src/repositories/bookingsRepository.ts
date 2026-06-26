import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import type { Database } from "~/lib/database.types";
import type { PoolRide } from "~/components/driver/RideCard";

type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export type DriverRideRow = Omit<PoolRide, "patient_first_name"> & {
  patient_full_name: string;
};

export type MyBookingRow = Pick<
  BookingRow,
  | "id"
  | "reference_code"
  | "pickup_address"
  | "dropoff_address"
  | "pickup_datetime"
  | "return_datetime"
  | "vehicle_type"
  | "trip_type"
  | "estimated_price"
  | "status"
  | "created_at"
  | "patient_full_name"
  | "cpam_status"
> & {
  driver_full_name: string | null;
  driver_phone: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_registration: string | null;
};

/**
 * Bookings for the current session's patient (RLS-scoped — anonymous
 * booking sessions persist per browser, so this returns every reservation
 * made from this device/browser, not a cross-device account history).
 * Driver display info (name, phone, vehicle) is joined in server-side once
 * a driver is assigned, since patients have no direct RLS access to other
 * users' profile rows.
 */
export async function fetchMyBookings(client: SupabaseClient): Promise<MyBookingRow[]> {
  const { data, error } = await client.rpc("get_my_bookings");

  if (error) {
    logger.error("bookings.fetchMyBookings failed", { error: error.message });
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * Patient self-service cancellation. The only way a patient can change
 * their own booking's status — direct UPDATE on `bookings` is no longer
 * granted to patients (see migration 009).
 */
export async function cancelBooking(
  client: SupabaseClient,
  bookingId: string,
  reason?: string
): Promise<void> {
  const { error } = await client.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason ?? null,
  });

  if (error) {
    if (error.message.includes("booking_not_cancellable")) {
      throw new Error("Cette réservation ne peut plus être annulée (course déjà en cours ou terminée).");
    }
    logger.error("bookings.cancelBooking failed", { error: error.message, bookingId });
    throw new Error(error.message);
  }
}

/**
 * Recovers a single booking by its human-friendly reference_code + phone
 * number, for when the anonymous browser session backing RLS access (see
 * fetchMyBookings) is lost — cleared cookies, private tab, different device.
 */
export async function lookupBookingByReference(
  client: SupabaseClient,
  referenceCode: string,
  phone: string
): Promise<MyBookingRow | null> {
  const { data, error } = await client.rpc("lookup_booking_by_reference", {
    p_reference_code: referenceCode,
    p_phone: phone,
  });

  if (error) {
    if (error.message.includes("too_many_attempts")) {
      throw new Error("Trop de tentatives pour cette référence. Réessayez dans 15 minutes ou contactez-nous directement.");
    }
    logger.error("bookings.lookupBookingByReference failed", { error: error.message });
    throw new Error(error.message);
  }
  return data?.[0] ?? null;
}

export async function fetchBookingStatusCounts(
  client: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await client.from("bookings").select("status");
  if (error) {
    logger.error("bookings.fetchBookingStatusCounts failed", { error: error.message });
    throw new Error(error.message);
  }

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
}

export async function fetchRidePool(client: SupabaseClient): Promise<PoolRide[]> {
  const { data, error } = await client
    .from("bookings_pool_for_drivers")
    .select("*")
    .eq("status", "available")
    .order("pickup_datetime", { ascending: true });

  if (error) {
    logger.error("bookings.fetchRidePool failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as PoolRide[];
}

export async function fetchDriverRides(
  client: SupabaseClient,
  driverId: string
): Promise<DriverRideRow[]> {
  const { data, error } = await client
    .from("bookings")
    .select(
      "id, driver_id, patient_full_name, patient_phone, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance_km, pickup_datetime, return_datetime, vehicle_type, trip_type, requires_wheelchair, requires_stretcher, requires_oxygen, passenger_count, estimated_price, status, created_at"
    )
    .eq("driver_id", driverId)
    .in("status", ["accepted", "in_progress", "completed"])
    .order("pickup_datetime", { ascending: false })
    .limit(20);

  if (error) {
    logger.error("bookings.fetchDriverRides failed", { error: error.message, driverId });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as DriverRideRow[];
}

export async function acceptRide(
  client: SupabaseClient,
  rideId: string,
  driverId: string
): Promise<void> {
  const { error } = await client
    .from("bookings")
    .update({ driver_id: driverId, status: "accepted" })
    .eq("id", rideId)
    .eq("status", "available"); // optimistic lock — only update if still available

  if (error) {
    logger.error("bookings.acceptRide failed", { error: error.message, rideId });
    throw new Error(error.message);
  }
}

export async function insertBooking(
  client: SupabaseClient,
  payload: BookingInsert
): Promise<{ id: string; reference_code: string }> {
  const { data, error } = await client
    .from("bookings")
    .insert(payload)
    .select("id, reference_code")
    .single();

  if (error) {
    logger.error("bookings.insertBooking failed", {
      error: error.message,
      vehicle_type: payload.vehicle_type,
      cpam_status: payload.cpam_status,
    });
    throw new Error(error.message);
  }

  return data;
}
