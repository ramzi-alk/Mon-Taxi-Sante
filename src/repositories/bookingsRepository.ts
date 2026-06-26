import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import type { Database } from "~/lib/database.types";
import type { PoolRide } from "~/components/driver/RideCard";

type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];

export type DriverRideRow = Omit<PoolRide, "patient_first_name"> & {
  patient_full_name: string;
};

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
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("bookings")
    .insert(payload)
    .select("id")
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
