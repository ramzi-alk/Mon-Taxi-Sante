import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-only — bypasses RLS via the service role key. Never import this
// from client components; only from TanStack Start server functions
// (src/server/**) that need to read data outside the caller's own RLS scope
// (e.g. fetching a patient's email to send a notification).
export function getSupabaseAdminClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
