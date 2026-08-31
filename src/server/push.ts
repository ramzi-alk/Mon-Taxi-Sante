import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "~/lib/database.types";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { withServerFnLogging } from "~/lib/logger";

// Client-safe: only createServerFn RPC stubs live here. Server-only push
// logic (which pulls in web-push's Node-only crypto dependency chain) lives
// in ./pushSend — never import that from here or from client code.

export const savePushSubscriptionServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { accessToken: string; endpoint: string; p256dh: string; auth: string }) => input
  )
  .handler(async ({ data }) =>
    withServerFnLogging("savePushSubscription", { endpoint: data.endpoint }, async () => {
      const supabase = createClient<Database>(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        { global: { headers: { Authorization: `Bearer ${data.accessToken}` } }, auth: { persistSession: false } }
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const admin = getSupabaseAdminClient();
      const { error } = await admin.from("driver_push_subscriptions").upsert(
        { driver_id: user.id, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" }
      );
      if (error) throw new Error(error.message);
    })
  );

export const deletePushSubscriptionServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; endpoint: string }) => input)
  .handler(async ({ data }) =>
    withServerFnLogging("deletePushSubscription", { endpoint: data.endpoint }, async () => {
      const supabase = createClient<Database>(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        { global: { headers: { Authorization: `Bearer ${data.accessToken}` } }, auth: { persistSession: false } }
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const admin = getSupabaseAdminClient();
      const { error } = await admin
        .from("driver_push_subscriptions")
        .delete()
        .eq("driver_id", user.id)
        .eq("endpoint", data.endpoint);
      if (error) throw new Error(error.message);
    })
  );

export const getVapidPublicKeyServerFn = createServerFn({ method: "GET" }).handler(async () => {
  return process.env.VAPID_PUBLIC_KEY ?? null;
});
