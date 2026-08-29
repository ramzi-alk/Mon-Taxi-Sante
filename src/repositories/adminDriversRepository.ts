import type { SupabaseClient } from "~/lib/supabase";
import type { Database } from "~/lib/database.types";
import { logger } from "~/lib/logger";

export type AdminDriverDirectoryRow = Database["public"]["Functions"]["get_admin_driver_directory"]["Returns"][number];

// Sentinel for "suspended until manually reactivated" — pool_suspended_until
// is a plain timestamp (no separate boolean flag), so an indefinite
// suspension is modeled as a date far enough out that it never lapses on
// its own. Mirrors the same column used for automatic suspensions
// (migration 030), just with a duration an admin controls instead of the
// fixed 7-day window applied after suspicious cancellations.
const INDEFINITE_SUSPENSION = new Date("2099-12-31T00:00:00Z").toISOString();

export async function fetchDriverDirectory(client: SupabaseClient): Promise<AdminDriverDirectoryRow[]> {
  const { data, error } = await client.rpc("get_admin_driver_directory");
  if (error) {
    logger.error("adminDrivers.fetchDriverDirectory failed", { error: error.message });
    throw new Error(error.message);
  }
  return data ?? [];
}

/**
 * pool_suspended_until is protected by a column-level REVOKE (migration
 * 030) — even an admin can't UPDATE it through the regular client, only
 * through this SECURITY DEFINER RPC (migration 043).
 */
export async function suspendDriver(client: SupabaseClient, driverProfileId: string): Promise<void> {
  const { error } = await client.rpc("admin_set_driver_suspension", {
    p_driver_profile_id: driverProfileId,
    p_until: INDEFINITE_SUSPENSION,
  });
  if (error) {
    logger.error("adminDrivers.suspendDriver failed", { error: error.message, driverProfileId });
    throw new Error(error.message);
  }
}

export interface DriverCancellation {
  booking_id: string;
  reason: string;
  was_suspicious: boolean;
  cancelled_at: string;
  bookings: { pickup_address: string; pickup_datetime: string } | null;
}

/**
 * Historique complet des désistements d'un chauffeur (booking_driver_
 * cancellations, migration 057), pour arbitrer une suspension au lieu de la
 * subir aveuglément (voir suspicious_cancellation_count/pool_suspended_until
 * sur AdminDriverDirectoryRow). RLS ("admin all") donne accès direct, pas
 * besoin de RPC dédiée comme côté chauffeur (get_my_cancellations, qui elle
 * masque l'adresse exacte).
 */
export async function fetchDriverCancellations(
  client: SupabaseClient,
  driverProfileId: string
): Promise<DriverCancellation[]> {
  const { data, error } = await client
    .from("booking_driver_cancellations")
    .select("booking_id, reason, was_suspicious, cancelled_at, bookings(pickup_address, pickup_datetime)")
    .eq("driver_id", driverProfileId)
    .order("cancelled_at", { ascending: false })
    .limit(50);

  if (error) {
    logger.error("adminDrivers.fetchDriverCancellations failed", { error: error.message, driverProfileId });
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as DriverCancellation[];
}

export async function reactivateDriver(client: SupabaseClient, driverProfileId: string): Promise<void> {
  // Cast: the generated Args type marks this defaultless plpgsql param as
  // non-null (Postgres doesn't expose per-arg nullability), but the RPC
  // genuinely accepts NULL to clear the suspension — same quirk documented
  // on update_booking in bookingsRepository.ts.
  const { error } = await client.rpc("admin_set_driver_suspension", {
    p_driver_profile_id: driverProfileId,
    p_until: null,
  } as unknown as Database["public"]["Functions"]["admin_set_driver_suspension"]["Args"]);
  if (error) {
    logger.error("adminDrivers.reactivateDriver failed", { error: error.message, driverProfileId });
    throw new Error(error.message);
  }
}
