import { createServerFileRoute } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import { logger } from "~/lib/logger";

// navigator.sendBeacon (déclenché au beforeunload du dashboard chauffeur —
// voir tableau-de-bord/chauffeur.tsx) ne peut ni porter d'en-tête
// Authorization, ni passer par le protocole RPC interne de createServerFn :
// d'où cette route HTTP brute dédiée, avec le jeton d'accès du chauffeur
// dans le corps de la requête plutôt qu'un en-tête. Le client Supabase est
// construit avec ce jeton (comme submitBookingServerFn), donc soumis à la
// même RLS qu'un appel chauffeur normal — impossible de faire passer un
// autre chauffeur hors ligne via cette route.
//
// Avant cette route, fermer l'onglet sans repasser "hors ligne" manuellement
// laissait le chauffeur visible comme disponible dans le pool de courses
// jusqu'au timeout du heartbeat côté serveur (30s de battement, mais aucune
// détection de déconnexion propre) — des courses pouvaient lui être
// proposées alors qu'il n'était plus joignable.
export const ServerRoute = createServerFileRoute("/api/driver-offline-beacon").methods({
  POST: async ({ request }) => {
    try {
      const rawBody = await request.text();
      const { accessToken } = JSON.parse(rawBody) as { accessToken?: string };
      if (!accessToken) {
        return new Response("Missing accessToken", { status: 400 });
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false },
      });

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return new Response("Invalid token", { status: 401 });
      }

      const { error } = await supabase
        .from("drivers_details")
        .update({ availability: "offline", availability_changed_at: new Date().toISOString() })
        .eq("profile_id", userData.user.id);

      if (error) {
        logger.error("driverOfflineBeacon.update failed", { error: error.message });
        return new Response("Update failed", { status: 500 });
      }

      return new Response(null, { status: 204 });
    } catch (err) {
      logger.error("driverOfflineBeacon failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return new Response("Error", { status: 500 });
    }
  },
});
