import webPush from "web-push";
import { getSupabaseAdminClient } from "~/lib/supabaseAdmin";
import { logger } from "~/lib/logger";

// Server-only: never import this from client code (hooks, components). It
// pulls in web-push's asn1.js/bn.js dependency chain, which breaks when
// bundled into the browser (e.g. crashes Safari with "undefined is not an
// object (evaluating 'x.prototype')" from asn1.js's inherits() helper).
// Client code should only ever import the createServerFn RPCs in ./push.

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
