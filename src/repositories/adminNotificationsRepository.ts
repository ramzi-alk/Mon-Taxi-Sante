import type { SupabaseClient } from "~/lib/supabase";

export interface AdminNotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  target_table: string | null;
  target_id: string | null;
  created_at: string;
  read_at: string | null;
}

const NOTIFICATION_COLUMNS = "id, type, title, body, target_table, target_id, created_at, read_at";

/**
 * Flux d'évènements pour le centre de notifications internes (cloche dans
 * l'entête admin) — distinct du journal d'activité (/admin/journal), qui
 * trace les actions des admins plutôt que les évènements qui méritent leur
 * attention. Alimenté uniquement par des triggers (voir migration 046).
 */
export async function fetchNotifications(
  client: SupabaseClient,
  limit = 20
): Promise<AdminNotificationRow[]> {
  const { data, error } = await client
    .from("admin_notifications")
    .select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchUnreadCount(client: SupabaseClient): Promise<number> {
  const { count, error } = await client
    .from("admin_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(
  client: SupabaseClient,
  id: string,
  readBy: string
): Promise<void> {
  const { error } = await client
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString(), read_by: readBy })
    .eq("id", id);

  if (error) throw error;
}

export async function markAllNotificationsRead(
  client: SupabaseClient,
  readBy: string
): Promise<void> {
  const { error } = await client
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString(), read_by: readBy })
    .is("read_at", null);

  if (error) throw error;
}
