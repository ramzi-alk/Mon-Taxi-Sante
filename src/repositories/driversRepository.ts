import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import type { Database } from "~/lib/database.types";

type DriverDetailsInsert = Database["public"]["Tables"]["drivers_details"]["Insert"];
type DriverAvailability = Database["public"]["Enums"]["driver_availability"];

export interface MyDriverDetails {
  availability: DriverAvailability;
  vehicle_type: Database["public"]["Enums"]["vehicle_type"];
  pmr_equipped: boolean;
  stretcher_equipped: boolean;
  oxygen_equipped: boolean;
}

export interface PendingDriver {
  id: string;
  profile_id: string;
  siret: string;
  company_name: string | null;
  vehicle_type: string;
  vehicle_registration: string;
  pmr_equipped: boolean;
  created_at: string;
  profiles: { full_name: string; email: string; phone: string | null } | null;
}

export async function insertDriverDetails(
  client: SupabaseClient,
  details: DriverDetailsInsert
): Promise<{ id: string }> {
  const { data, error } = await client
    .from("drivers_details")
    .insert(details)
    .select("id")
    .single();
  if (error) {
    logger.error("drivers.insertDriverDetails failed", {
      error: error.message,
      profileId: details.profile_id,
    });
    throw new Error(error.message);
  }
  return data;
}

export async function fetchPendingDrivers(client: SupabaseClient): Promise<PendingDriver[]> {
  const { data, error } = await client
    .from("drivers_details")
    .select(
      "id, profile_id, siret, company_name, vehicle_type, vehicle_registration, pmr_equipped, created_at, profiles:profile_id(full_name, email, phone)"
    )
    .is("approved_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("drivers.fetchPendingDrivers failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as PendingDriver[];
}

export async function approveDriver(
  client: SupabaseClient,
  driverDetailsId: string,
  approvedBy: string | null
): Promise<void> {
  const { error } = await client
    .from("drivers_details")
    .update({ approved_at: new Date().toISOString(), approved_by: approvedBy })
    .eq("id", driverDetailsId);

  if (error) {
    logger.error("drivers.approveDriver failed", { error: error.message, driverDetailsId });
    throw new Error(error.message);
  }
}

/**
 * Reads the calling driver's own availability + vehicle/equipment, scoped
 * by RLS ("drivers: own read/write", profile_id = auth.uid()) — used to
 * drive the online/pause/offline toggle on the dashboard.
 */
export async function fetchMyAvailability(
  client: SupabaseClient,
  profileId: string
): Promise<MyDriverDetails | null> {
  const { data, error } = await client
    .from("drivers_details")
    .select("availability, vehicle_type, pmr_equipped, stretcher_equipped, oxygen_equipped")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    logger.error("drivers.fetchMyAvailability failed", { error: error.message, profileId });
    throw new Error(error.message);
  }
  return data;
}

/**
 * Driver-controlled online/paused/offline toggle. Direct UPDATE is fine
 * here (unlike bookings) — RLS already scopes this to the driver's own row.
 */
export async function setAvailability(
  client: SupabaseClient,
  profileId: string,
  availability: DriverAvailability
): Promise<void> {
  const { error } = await client
    .from("drivers_details")
    .update({ availability, availability_changed_at: new Date().toISOString() })
    .eq("profile_id", profileId);

  if (error) {
    logger.error("drivers.setAvailability failed", { error: error.message, profileId, availability });
    throw new Error(error.message);
  }
}
