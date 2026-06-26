import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { MyBookingRow } from "~/repositories/bookingsRepository";
import { logger } from "~/lib/logger";

interface LookupBookingInput {
  reference_code: string;
  phone: string;
  turnstileToken: string;
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    logger.error("turnstile.verify skipped: missing TURNSTILE_SECRET_KEY");
    return false;
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const result = (await response.json()) as { success: boolean };
  return result.success;
}

export const lookupBookingServerFn = createServerFn({ method: "POST" })
  .validator((input: LookupBookingInput) => input)
  .handler(async ({ data }): Promise<MyBookingRow | null> => {
    const isHuman = await verifyTurnstile(data.turnstileToken);
    if (!isHuman) {
      throw new Error("Vérification anti-robot invalide, réessayez.");
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    return bookingsRepository.lookupBookingByReference(supabase, data.reference_code, data.phone);
  });
