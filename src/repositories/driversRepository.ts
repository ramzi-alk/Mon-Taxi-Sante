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
  parking_municipality: string | null;
  acceptance_radius_km: number | null;
  // Renseigné et futur si le chauffeur est temporairement suspendu du pool
  // suite à des annulations suspectes répétées (cf. cancel_ride_by_driver,
  // migration 030). Sert à afficher un bandeau explicatif sur le tableau de
  // bord plutôt que de laisser le chauffeur croire qu'il n'y a aucune course.
  pool_suspended_until: string | null;
}

export interface MyDriverAccount {
  vehicle_type: Database["public"]["Enums"]["vehicle_type"];
  vehicle_registration: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  pmr_equipped: boolean;
  stretcher_equipped: boolean;
  oxygen_equipped: boolean;
  parking_municipality: string | null;
  parking_lat: number | null;
  parking_lng: number | null;
  siret: string;
  company_name: string | null;
  subscription_status: Database["public"]["Enums"]["subscription_status"];
  subscription_ends_at: string | null;
}

export interface MyDriverStats {
  rides_completed: number;
  total_km: number;
  total_earnings: number;
  rides_today: number;
  earnings_today: number;
  average_rating: number | null;
}

export interface PendingDriver {
  id: string;
  profile_id: string;
  siret: string;
  company_name: string | null;
  vehicle_type: string;
  vehicle_registration: string;
  pmr_equipped: boolean;
  parking_municipality: string | null;
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
      "id, profile_id, siret, company_name, vehicle_type, vehicle_registration, pmr_equipped, parking_municipality, created_at, profiles:profile_id(full_name, email, phone)"
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
    .select(
      "availability, vehicle_type, pmr_equipped, stretcher_equipped, oxygen_equipped, parking_municipality, acceptance_radius_km, pool_suspended_until"
    )
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

/**
 * Driver-controlled radius (km) around their parking position beyond which
 * pool rides are hidden (see bookings_pool_for_drivers). Direct UPDATE is
 * fine — RLS already scopes this to the driver's own row. NULL clears the
 * limit (pool shows every compatible ride regardless of distance).
 */
export async function setAcceptanceRadius(
  client: SupabaseClient,
  profileId: string,
  radiusKm: number | null
): Promise<void> {
  const { error } = await client
    .from("drivers_details")
    .update({ acceptance_radius_km: radiusKm })
    .eq("profile_id", profileId);

  if (error) {
    logger.error("drivers.setAcceptanceRadius failed", { error: error.message, profileId, radiusKm });
    throw new Error(error.message);
  }
}

/**
 * Reads the calling driver's full editable account record (vehicle,
 * equipment, parking, company/subscription) for the "Mon compte" page.
 * Scoped by RLS, same as fetchMyAvailability.
 */
export async function fetchMyAccountDetails(
  client: SupabaseClient,
  profileId: string
): Promise<MyDriverAccount | null> {
  const { data, error } = await client
    .from("drivers_details")
    .select(
      "vehicle_type, vehicle_registration, vehicle_brand, vehicle_model, vehicle_year, pmr_equipped, stretcher_equipped, oxygen_equipped, parking_municipality, parking_lat, parking_lng, siret, company_name, subscription_status, subscription_ends_at"
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    logger.error("drivers.fetchMyAccountDetails failed", { error: error.message, profileId });
    throw new Error(error.message);
  }
  return data;
}

/**
 * Driver-controlled vehicle/equipment and parking address update. Direct
 * UPDATE is fine — RLS already scopes this to the driver's own row.
 * siret/company_name/subscription fields are deliberately not editable here.
 */
export async function updateMyAccountDetails(
  client: SupabaseClient,
  profileId: string,
  fields: Partial<{
    vehicle_type: Database["public"]["Enums"]["vehicle_type"];
    vehicle_registration: string;
    vehicle_brand: string | null;
    vehicle_model: string | null;
    vehicle_year: number | null;
    pmr_equipped: boolean;
    stretcher_equipped: boolean;
    oxygen_equipped: boolean;
    parking_municipality: string;
    parking_lat: number | null;
    parking_lng: number | null;
  }>
): Promise<void> {
  const { error } = await client.from("drivers_details").update(fields).eq("profile_id", profileId);

  if (error) {
    logger.error("drivers.updateMyAccountDetails failed", { error: error.message, profileId });
    throw new Error(error.message);
  }
}

/**
 * Stats for the connected driver's dashboard (completed rides, cumulative
 * km/earnings, and today's figures) via the get_my_driver_stats RPC — see
 * migration 022.
 */
export async function fetchMyDriverStats(client: SupabaseClient): Promise<MyDriverStats | null> {
  const { data, error } = await client.rpc("get_my_driver_stats");

  if (error) {
    logger.error("drivers.fetchMyDriverStats failed", { error: error.message });
    throw new Error(error.message);
  }
  return data?.[0] ?? null;
}

export interface DriverStatsPeriod {
  rides: number;
  km: number;
  earnings: number;
}

export async function fetchDriverStatsSince(
  client: SupabaseClient,
  since: Date
): Promise<DriverStatsPeriod> {
  const { data, error } = await client
    .from("bookings")
    .select("distance_km, estimated_price")
    .eq("status", "completed")
    .gte("completed_at", since.toISOString());

  if (error) {
    logger.error("drivers.fetchDriverStatsSince failed", { error: error.message });
    throw new Error(error.message);
  }

  const rows = data ?? [];
  return {
    rides: rows.length,
    km: Math.round(rows.reduce((sum, r) => sum + (r.distance_km ?? 0), 0)),
    earnings: rows.reduce((sum, r) => sum + (r.estimated_price ?? 0), 0),
  };
}
