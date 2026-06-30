import { useEffect, useState, useCallback } from "react";
import { supabase } from "~/lib/supabase";
import {
  getVapidPublicKeyServerFn,
  savePushSubscriptionServerFn,
  deletePushSubscriptionServerFn,
} from "~/server/push";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export interface UsePushNotifications {
  isSupported: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function usePushNotifications(): UsePushNotifications {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!isSupported) return "unsupported";
    return (Notification.permission as PermissionState) ?? "default";
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // On mount: register SW and check existing subscription
  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!cancelled) setIsSubscribed(!!existing);
      } catch {
        // SW registration failed — not fatal
      }
    })();

    return () => { cancelled = true; };
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PermissionState);
      if (perm !== "granted") return;

      const vapidPublicKey = await getVapidPublicKeyServerFn();
      if (!vapidPublicKey) throw new Error("Clé VAPID non configurée");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const token = await getAccessToken();
      if (!token) throw new Error("Non authentifié");

      const json = sub.toJSON();
      await savePushSubscriptionServerFn({
        data: {
          accessToken: token,
          endpoint: sub.endpoint,
          p256dh: (json.keys as Record<string, string>).p256dh,
          auth: (json.keys as Record<string, string>).auth,
        },
      });
      setIsSubscribed(true);
    } catch (err) {
      console.error("push.subscribe failed", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const token = await getAccessToken();
        if (token) {
          await deletePushSubscriptionServerFn({
            data: { accessToken: token, endpoint: sub.endpoint },
          });
        }
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("push.unsubscribe failed", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
