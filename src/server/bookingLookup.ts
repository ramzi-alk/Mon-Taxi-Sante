import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import type { MyBookingRow } from "~/repositories/bookingsRepository";
import { withServerFnLogging } from "~/lib/logger";
import { verifyTurnstile } from "./turnstile";

interface LookupBookingInput {
  reference_code: string;
  phone: string;
  turnstileToken: string;
}

export const lookupBookingServerFn = createServerFn({ method: "POST" })
  .validator((input: LookupBookingInput) => input)
  .handler(async ({ data }): Promise<MyBookingRow | null> =>
    withServerFnLogging("lookupBooking", { referenceCode: data.reference_code }, async () => {
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
    })
  );
