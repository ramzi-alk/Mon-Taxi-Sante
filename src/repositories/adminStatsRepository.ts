import type { SupabaseClient } from "~/lib/supabase";

export interface AdminKpiPeriodCurrent {
  total_bookings: number;
  cancelled_count: number;
  cancellation_rate: number | null;
  unassigned_count: number;
  unassigned_rate: number | null;
  avg_assignment_minutes: number | null;
  avg_rating: number | null;
  rating_count: number;
}

export interface AdminKpiPeriodPrevious {
  total_bookings: number;
  cancellation_rate: number | null;
  unassigned_rate: number | null;
  avg_assignment_minutes: number | null;
}

export interface AdminKpiMunicipality {
  municipality: string;
  count: number;
}

export interface AdminOperationalKpis {
  days: number;
  current: AdminKpiPeriodCurrent;
  previous: AdminKpiPeriodPrevious;
  by_municipality: AdminKpiMunicipality[];
}

/**
 * KPIs opérationnels sur une fenêtre glissante (7/30 jours), avec la
 * période précédente de même durée pour calculer une tendance côté UI.
 * Calculé à la volée par get_admin_operational_kpis (migration 046) —
 * pas de vue matérialisée, le volume actuel de courses ne le justifie pas.
 */
export async function fetchOperationalKpis(
  client: SupabaseClient,
  days: number
): Promise<AdminOperationalKpis> {
  const { data, error } = await client.rpc("get_admin_operational_kpis", { p_days: days });
  if (error) throw error;
  return data as unknown as AdminOperationalKpis;
}

export interface AdminCallClickSource {
  source: string;
  count: number;
}

export interface AdminCallClickStats {
  total: number;
  last_30_days: number;
  by_source: AdminCallClickSource[];
}

/**
 * Nombre de clics sur les CTA "Appeler" du site (numéro standard), toutes
 * pages confondues. Calculé par get_admin_call_click_stats (migration 052).
 */
export async function fetchCallClickStats(client: SupabaseClient): Promise<AdminCallClickStats> {
  const { data, error } = await client.rpc("get_admin_call_click_stats");
  if (error) throw error;
  return data as unknown as AdminCallClickStats;
}

export interface CpamExportRow {
  reference_code: string;
  patient_full_name: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_datetime: string;
  completed_at: string | null;
  distance_km: number | null;
  vehicle_type: string;
  cpam_status: string;
  mutual_name: string | null;
  is_hospitalization: boolean;
  estimated_price: number | null;
  driver_full_name: string | null;
}

const CPAM_EXPORT_COLUMNS =
  "reference_code, patient_full_name, pickup_address, dropoff_address, pickup_datetime, completed_at, distance_km, vehicle_type, cpam_status, mutual_name, is_hospitalization, estimated_price, driver:profiles!bookings_driver_id_fkey(full_name)";

/**
 * Courses terminées sur une période, pour l'export comptabilité/CPAM.
 * Lecture directe de `bookings` (policy RLS "admin all", même principe que
 * adminBookingsRepository) — pas besoin de RPC dédiée.
 */
export async function fetchCpamExportRows(
  client: SupabaseClient,
  range: { from: string; to: string }
): Promise<CpamExportRow[]> {
  const { data, error } = await client
    .from("bookings")
    .select(CPAM_EXPORT_COLUMNS)
    .eq("status", "completed")
    .gte("completed_at", range.from)
    .lte("completed_at", range.to)
    .order("completed_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    reference_code: row.reference_code,
    patient_full_name: row.patient_full_name,
    pickup_address: row.pickup_address,
    dropoff_address: row.dropoff_address,
    pickup_datetime: row.pickup_datetime,
    completed_at: row.completed_at,
    distance_km: row.distance_km,
    vehicle_type: row.vehicle_type,
    cpam_status: row.cpam_status,
    mutual_name: row.mutual_name,
    is_hospitalization: row.is_hospitalization,
    estimated_price: row.estimated_price,
    driver_full_name: (row.driver as { full_name: string } | null)?.full_name ?? null,
  }));
}
