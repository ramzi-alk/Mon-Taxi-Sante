import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { logger } from "./logger";

// Client Supabase séparé du singleton principal (~/lib/supabase.ts), utilisé
// uniquement pour la connexion patient par email vérifié (OTP, voir
// PatientEmailLogin.tsx). signInWithOtp/verifyOtp changeraient l'identité
// (auth.uid()) de la session principale — celle-ci reste la session anonyme
// utilisée pour réserver, annuler et noter depuis cet appareil (voir
// BookingForm.tsx). Un storageKey dédié évite toute collision avec elle
// tout en permettant de rester connecté d'une visite à l'autre.
let client: ReturnType<typeof createClient<Database>> | null = null;

export function getPatientEmailAuthClient() {
  if (!client) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error("supabaseIsolated.client.init failed: missing environment variables");
      throw new Error("Missing Supabase environment variables. Check .env.local");
    }

    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: "mts-patient-email-auth",
      },
    });
  }
  return client;
}
