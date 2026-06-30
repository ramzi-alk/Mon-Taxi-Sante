import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";
import type { Database } from "~/lib/database.types";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { logger } from "~/lib/logger";

function getConfiguredWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:contact@mon-taxi-sante.com";
  if (!publicKey || !privateKey) {
    logger.warn("push.vapidKeysNotConfigured — skipping push");
    return null;
  }
  webPush.setVapidDetails(email, publicKey, privateKey);
  return webPush;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function removeExpiredSubscription(id: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  await admin.from("driver_push_subscriptions").delete().eq("id", id);
}

export async function sendPushToDriver(driverId: string, payload: PushPayload): Promise<void> {
  const wp = getConfiguredWebPush();
  if (!wp) return;

  const admin = getSupabaseAdminClient();
  const { data: subs } = await admin
    .from("driver_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("driver_id", driverId);

  if (!subs?.length) return;

  const message = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await removeExpiredSubscription(sub.id);
        } else {
          logger.error("push.sendToDriver failed", { error: String(err), driverId });
        }
      }
    })
  );
}

export async function sendPushToAllDrivers(payload: PushPayload): Promise<void> {
  const wp = getConfiguredWebPush();
  if (!wp) return;

  const admin = getSupabaseAdminClient();
  const { data: subs } = await admin
    .from("driver_push_subscriptions")
    .select("id, endpoint, p256dh, auth");

  if (!subs?.length) return;

  const message = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await removeExpiredSubscription(sub.id);
        }
      }
    })
  );
}

// ─── ServerFns (called from client) ─────────────────────────────────────────

export const savePushSubscriptionServerFn = createServerFn({ method: "POST" })
  .validator(
    (input: { accessToken: string; endpoint: string; p256dh: string; auth: string }) => input
  )
  .handler(async ({ data }) => {
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
    await admin.from("driver_push_subscriptions").upsert(
      { driver_id: user.id, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
      { onConflict: "endpoint" }
    );
  });

export const deletePushSubscriptionServerFn = createServerFn({ method: "POST" })
  .validator((input: { accessToken: string; endpoint: string }) => input)
  .handler(async ({ data }) => {
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
    await admin
      .from("driver_push_subscriptions")
      .delete()
      .eq("driver_id", user.id)
      .eq("endpoint", data.endpoint);
  });

export const getVapidPublicKeyServerFn = createServerFn({ method: "GET" }).handler(async () => {
  return process.env.VAPID_PUBLIC_KEY ?? null;
});
