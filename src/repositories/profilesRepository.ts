import type { SupabaseClient } from "~/lib/supabase";
import type { Database } from "~/lib/database.types";

type ProfileRole = Database["public"]["Tables"]["profiles"]["Row"]["role"];

export async function getProfileRole(
  client: SupabaseClient,
  userId: string
): Promise<ProfileRole | null> {
  const { data } = await client.from("profiles").select("role").eq("id", userId).single();
  return data?.role ?? null;
}
