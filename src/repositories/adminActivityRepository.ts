import type { SupabaseClient } from "~/lib/supabase";
import { logger } from "~/lib/logger";

export interface AdminActivityRow {
  id: string;
  action: string;
  target_table: string;
  target_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string; email: string | null } | null;
}

export interface AdminActivityFilters {
  targetTable?: string;
}

export async function fetchActivityLog(
  client: SupabaseClient,
  filters: AdminActivityFilters,
  page: number,
  pageSize: number
): Promise<{ rows: AdminActivityRow[]; total: number }> {
  let query = client
    .from("admin_activity_log")
    .select(
      "id, action, target_table, target_id, before, after, created_at, actor:profiles!admin_activity_log_actor_id_fkey(full_name, email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.targetTable) {
    query = query.eq("target_table", filters.targetTable);
  }

  const from = page * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);

  if (error) {
    logger.error("adminActivity.fetchActivityLog failed", { error: error.message });
    throw new Error(error.message);
  }
  return { rows: (data ?? []) as unknown as AdminActivityRow[], total: count ?? 0 };
}
