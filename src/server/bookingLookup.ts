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

interface LookupSavedBookingsInput {
  turnstileToken: string;
  lookups: Array<{ referenceCode: string; phone: string }>;
}

const MAX_BATCH_LOOKUPS = 10;

/**
 * Batch version of lookupBookingServerFn for "Mes réservations enregistrées"
 * (voir src/lib/savedBookingLookups.ts) : une seule vérification anti-robot
 * couvre le rafraîchissement de toute la liste au lieu d'exiger un nouveau
 * défi Turnstile par réservation (un jeton Turnstile n'est vérifiable qu'une
 * seule fois côté Cloudflare). Chaque entrée reste individuellement prouvée
 * par référence + téléphone auprès de lookup_booking_by_reference, qui
 * conserve son propre rate-limit par référence (booking_lookup_attempts) —
 * ce lot ne le contourne pas, il en agrège seulement les appels.
 */
export const lookupSavedBookingsServerFn = createServerFn({ method: "POST" })
  .validator((input: LookupSavedBookingsInput) => input)
  .handler(async ({ data }): Promise<Array<{ referenceCode: string; booking: MyBookingRow | null }>> =>
    withServerFnLogging(
      "lookupSavedBookings",
      { count: data.lookups.length },
      async () => {
        const isHuman = await verifyTurnstile(data.turnstileToken);
        if (!isHuman) {
          throw new Error("Vérification anti-robot invalide, réessayez.");
        }

        const lookups = data.lookups.slice(0, MAX_BATCH_LOOKUPS);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
        const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
        });

        const results: Array<{ referenceCode: string; booking: MyBookingRow | null }> = [];
        for (const { referenceCode, phone } of lookups) {
          try {
            const booking = await bookingsRepository.lookupBookingByReference(supabase, referenceCode, phone);
            results.push({ referenceCode, booking });
          } catch {
            // Une entrée en échec (verrouillée, référence introuvable après
            // une éventuelle annulation ailleurs, etc.) ne doit pas priver
            // l'utilisateur des autres réservations enregistrées.
            results.push({ referenceCode, booking: null });
          }
        }
        return results;
      }
    )
  );
