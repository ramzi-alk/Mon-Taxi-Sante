import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { logger } from "./logger";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error("supabase.client.init failed: missing environment variables", {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
  throw new Error("Missing Supabase environment variables. Check .env.local");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export type SupabaseClient = typeof supabase;
