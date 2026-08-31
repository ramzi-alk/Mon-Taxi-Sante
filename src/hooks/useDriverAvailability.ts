import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "~/lib/supabase";
import * as authRepository from "~/repositories/authRepository";
import * as driversRepository from "~/repositories/driversRepository";
import { logger } from "~/lib/logger";
import { useToast } from "~/components/ui/toast";
import type { Database } from "~/lib/database.types";

type DriverAvailability = Database["public"]["Enums"]["driver_availability"];

async function fetchMyAvailability(): Promise<driversRepository.MyDriverDetails | null> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) return null;
  return driversRepository.fetchMyAvailability(supabase, user.id);
}

async function setAvailability(availability: DriverAvailability): Promise<void> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) throw new Error("Non authentifié");
  await driversRepository.setAvailability(supabase, user.id, availability);
}

async function setAcceptanceRadius(radiusKm: number | null): Promise<void> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) throw new Error("Non authentifié");
  await driversRepository.setAcceptanceRadius(supabase, user.id, radiusKm);
}

async function updateHeartbeat(): Promise<void> {
  await supabase.rpc("update_driver_heartbeat");
}

/**
 * Statut online/paused/offline du chauffeur (le pool ne montre les courses
 * qu'aux chauffeurs "online", migration 018), suspension du pool, bandeau
 * d'échéance d'abonnement, rayon d'acceptation, et le heartbeat qui maintient
 * le statut "online" côté serveur tant que l'onglet reste ouvert.
 */
export function useDriverAvailability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dismissedSubscriptionWarningFor, setDismissedSubscriptionWarningFor] = useState<string | null>(() => {
    try {
      return localStorage.getItem("driver-subscription-warning-dismissed-for");
    } catch {
      return null;
    }
  });

  const availabilityQuery = useQuery({
    queryKey: ["my-availability"],
    queryFn: fetchMyAvailability,
  });
  const availability = availabilityQuery.data?.availability ?? "offline";

  // Suspension temporaire du pool suite à des annulations suspectes répétées
  // (cf. cancel_ride_by_driver, migration 030) — distincte du statut
  // online/paused/offline, qui reste sous le contrôle du chauffeur.
  const poolSuspendedUntil = availabilityQuery.data?.pool_suspended_until ?? null;
  const isPoolSuspended = poolSuspendedUntil != null && new Date(poolSuspendedUntil) > new Date();

  // Bandeau proactif d'échéance d'abonnement — la donnée existait déjà
  // (affichée en lecture seule sur "Mon compte") mais rien n'alertait le
  // chauffeur avant la coupure d'accès au passage en 'past_due'.
  const subscriptionStatus = availabilityQuery.data?.subscription_status;
  const subscriptionEndsAt = availabilityQuery.data?.subscription_ends_at ?? null;
  const daysUntilSubscriptionEnds =
    subscriptionEndsAt != null
      ? Math.ceil((new Date(subscriptionEndsAt).getTime() - Date.now()) / 86_400_000)
      : null;
  const showSubscriptionWarning =
    (subscriptionStatus === "trial" || subscriptionStatus === "active") &&
    daysUntilSubscriptionEnds != null &&
    daysUntilSubscriptionEnds >= 0 &&
    daysUntilSubscriptionEnds <= 7 &&
    dismissedSubscriptionWarningFor !== subscriptionEndsAt;

  function dismissSubscriptionWarning() {
    setDismissedSubscriptionWarningFor(subscriptionEndsAt);
    try {
      localStorage.setItem("driver-subscription-warning-dismissed-for", subscriptionEndsAt ?? "");
    } catch {}
  }

  const availabilityMutation = useMutation({
    mutationFn: setAvailability,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-availability"] });
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
    },
    onError: (error) => {
      logger.error("driver.setAvailability failed", { error: error.message });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const radiusMutation = useMutation({
    mutationFn: setAcceptanceRadius,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-availability"] });
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      toast({ title: "Rayon mis à jour", variant: "success" });
    },
    onError: (error) => {
      logger.error("driver.setAcceptanceRadius failed", { error: error.message });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  // Heartbeat toutes les 30 s quand le chauffeur est en ligne. Le jeton
  // d'accès est mis en cache dans une ref (rafraîchi à chaque battement) car
  // beforeunload ne peut pas attendre un appel async au moment de fermer
  // l'onglet — voir api/driver-offline-beacon.ts pour la route qui reçoit
  // ce jeton et repasse réellement le chauffeur hors ligne.
  const accessTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (availability !== "online") return;

    const refreshAccessToken = () => {
      supabase.auth.getSession().then(({ data }) => {
        accessTokenRef.current = data.session?.access_token ?? null;
      });
    };

    refreshAccessToken();
    updateHeartbeat().catch(() => {});
    const id = setInterval(() => {
      updateHeartbeat().catch(() => {});
      refreshAccessToken();
    }, 30_000);

    const onUnload = () => {
      const accessToken = accessTokenRef.current;
      if (!accessToken) return;
      navigator.sendBeacon?.(
        "/api/driver-offline-beacon",
        new Blob([JSON.stringify({ accessToken })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [availability]);

  return {
    availabilityQuery,
    availability,
    isPoolSuspended,
    poolSuspendedUntil,
    showSubscriptionWarning,
    daysUntilSubscriptionEnds,
    subscriptionEndsAt,
    dismissSubscriptionWarning,
    availabilityMutation,
    radiusMutation,
  };
}
