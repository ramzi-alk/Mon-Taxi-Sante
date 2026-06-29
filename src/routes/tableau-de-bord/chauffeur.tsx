import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Car,
  CheckCircle2,
  Clock,
  RefreshCw,
  Bell,
  BellOff,
  Circle,
  Pause,
  PowerOff,
  ShieldAlert,
  Gauge,
  Wallet,
  MapPin,
  UserCog,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "~/lib/supabase";
import { cn, formatPrice } from "~/lib/utils";
import { useRealtime } from "~/hooks/useRealtime";
import { RideCard, type PoolRide } from "~/components/driver/RideCard";
import { PoolList } from "~/components/driver/PoolList";
import { useToast } from "~/components/ui/toast";
import * as authRepository from "~/repositories/authRepository";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import * as driversRepository from "~/repositories/driversRepository";
import type { DriverStatsPeriod } from "~/repositories/driversRepository";
import { notifyBookingAcceptedServerFn, notifyRideUnassignedServerFn } from "~/server/email";
import { logger } from "~/lib/logger";
import type { Database } from "~/lib/database.types";

type DriverAvailability = Database["public"]["Enums"]["driver_availability"];

export const Route = createFileRoute("/tableau-de-bord/chauffeur")({
  head: () => ({
    meta: [
      { title: "Tableau de bord chauffeur — Mon Taxi Santé" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DriverDashboard,
});

// ─── Data fetching ───────────────────────────────────────────────────────────

async function fetchRidePool(): Promise<PoolRide[]> {
  return bookingsRepository.fetchRidePool(supabase);
}

async function fetchMyRides(): Promise<PoolRide[]> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) return [];

  const rides = await bookingsRepository.fetchDriverRides(supabase, user.id);

  // Map to PoolRide shape (rename patient_full_name → patient_first_name)
  return rides.map((r) => ({
    ...r,
    patient_first_name: r.patient_full_name?.split(" ")[0] ?? "—",
  })) as unknown as PoolRide[];
}

async function acceptRide(rideId: string): Promise<void> {
  await bookingsRepository.acceptRide(supabase, rideId);
}

async function acceptSeriesRides(rideId: string): Promise<void> {
  await bookingsRepository.acceptSeriesRides(supabase, rideId);
}

async function updateHeartbeat(): Promise<void> {
  await supabase.rpc("update_driver_heartbeat");
}

async function startRide(rideId: string): Promise<void> {
  await bookingsRepository.startRide(supabase, rideId);
}

async function completeRide(rideId: string): Promise<void> {
  await bookingsRepository.completeRide(supabase, rideId);
}

async function cancelRideByDriver(rideId: string): Promise<void> {
  await bookingsRepository.cancelRideByDriver(supabase, rideId);
}

async function rateRide(vars: { rideId: string; rating: number; comment?: string }): Promise<void> {
  await bookingsRepository.rateBookingAsDriver(supabase, vars.rideId, vars.rating, vars.comment);
}

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

async function fetchMyDriverStats(): Promise<driversRepository.MyDriverStats | null> {
  return driversRepository.fetchMyDriverStats(supabase);
}

async function fetchDriverStatsSince(since: Date): Promise<DriverStatsPeriod> {
  return driversRepository.fetchDriverStatsSince(supabase, since);
}

async function setAcceptanceRadius(radiusKm: number | null): Promise<void> {
  const user = await authRepository.getCurrentUser(supabase);
  if (!user) throw new Error("Non authentifié");
  await driversRepository.setAcceptanceRadius(supabase, user.id, radiusKm);
}

// ─── Stats card ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:gap-4 sm:rounded-2xl sm:p-5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${color}`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-gray-900 leading-tight sm:text-2xl">{value}</p>
        <p className="text-xs leading-snug text-muted-foreground sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

function DriverDashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [tab, setTab] = useState<"pool" | "my_rides">("pool");
  const [statsPeriod, setStatsPeriod] = useState<"today" | "week" | "month" | "total">("today");
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem("driver-sound") !== "off"; } catch { return true; }
  });
  const prevPoolCountRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [acceptingSeriesId, setAcceptingSeriesId] = useState<string | null>(null);

  // Driver's own online/paused/offline status — the pool only shows rides
  // to drivers who are "online" (see migration 018).
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

  const statsQuery = useQuery({
    queryKey: ["my-driver-stats"],
    queryFn: fetchMyDriverStats,
  });

  const periodSince = (() => {
    const d = new Date();
    if (statsPeriod === "week") { d.setDate(d.getDate() - 7); return d; }
    if (statsPeriod === "month") { d.setDate(d.getDate() - 30); return d; }
    return d;
  })();

  const periodStatsQuery = useQuery({
    queryKey: ["driver-stats-since", statsPeriod],
    queryFn: () => fetchDriverStatsSince(periodSince),
    enabled: statsPeriod === "week" || statsPeriod === "month",
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

  // Pool query
  const poolQuery = useQuery({
    queryKey: ["ride-pool"],
    queryFn: fetchRidePool,
    refetchInterval: 30_000,
  });

  // My rides query
  const myRidesQuery = useQuery({
    queryKey: ["my-rides"],
    queryFn: fetchMyRides,
  });

  // Realtime subscription — updates pool in real-time
  useRealtime({
    table: "bookings",
    queryKey: ["ride-pool"],
    event: "*",
    filter: "status=eq.available",
  });

  // Also update my rides when a booking is accepted
  useRealtime({
    table: "bookings",
    queryKey: ["my-rides"],
    event: "UPDATE",
  });

  const acceptMutation = useMutation({
    mutationFn: acceptRide,
    onMutate: (rideId) => setAcceptingId(rideId),
    onSuccess: (_, rideId) => {
      toast({ title: "Course acceptée !", variant: "success" });
      notifyBookingAcceptedServerFn({ data: { bookingId: rideId } }).catch((err) => {
        logger.warn("email.notifyBookingAccepted failed", { error: err.message, rideId });
      });
    },
    onSettled: () => {
      setAcceptingId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.acceptRide failed", { error: error.message, rideId });
      toast({ title: "Course non disponible", description: error.message, variant: "error" });
    },
  });

  const startMutation = useMutation({
    mutationFn: startRide,
    onMutate: (rideId) => setStartingId(rideId),
    onSuccess: () => {
      toast({ title: "Course démarrée", variant: "success" });
    },
    onSettled: () => {
      setStartingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.startRide failed", { error: error.message, rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeRide,
    onMutate: (rideId) => setCompletingId(rideId),
    onSuccess: () => {
      toast({ title: "Course terminée !", variant: "success" });
    },
    onSettled: () => {
      setCompletingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.completeRide failed", { error: error.message, rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelRideByDriver,
    onMutate: (rideId) => setCancellingId(rideId),
    onSuccess: (_, rideId) => {
      toast({ title: "Course annulée", description: "La course est retournée dans le pool.", variant: "default" });
      notifyRideUnassignedServerFn({ data: { bookingId: rideId } }).catch((err) => {
        logger.warn("email.notifyRideUnassigned failed", { error: err.message, rideId });
      });
    },
    onSettled: () => {
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.cancelRideByDriver failed", { error: error.message, rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: rateRide,
    onMutate: (vars) => setRatingId(vars.rideId),
    onSuccess: () => {
      toast({ title: "Avis envoyé", variant: "success" });
    },
    onSettled: () => {
      setRatingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
      queryClient.invalidateQueries({ queryKey: ["my-driver-stats"] });
    },
    onError: (error, vars) => {
      logger.error("driver.rateBookingAsDriver failed", { error: error.message, rideId: vars.rideId });
      toast({ title: "Erreur", description: error.message, variant: "error" });
    },
  });

  const poolRides = poolQuery.data ?? [];
  const myRides = myRidesQuery.data ?? [];
  const todayRides = myRides.filter(
    (r) => new Date(r.pickup_datetime).toDateString() === new Date().toDateString()
  );

  // Groupe les courses par series_id pour les passer aux RideCard
  const ridesBySeries = myRides.reduce<Record<string, PoolRide[]>>((acc, r) => {
    if (r.series_id) {
      if (!acc[r.series_id]) acc[r.series_id] = [];
      acc[r.series_id].push(r);
    }
    return acc;
  }, {});

  const myRidesGrouped = (() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const tomorrowStr = new Date(now.getTime() + 86400000).toDateString();
    const weekEnd = new Date(now.getTime() + 7 * 86400000);
    const groups: { label: string; sublabel?: string; rides: PoolRide[] }[] = [
      { label: "Aujourd'hui", rides: [] },
      { label: "Demain", rides: [] },
      { label: "Cette semaine", rides: [] },
      { label: "Plus tard", rides: [] },
    ];
    for (const ride of myRides) {
      const d = new Date(ride.pickup_datetime);
      if (d.toDateString() === todayStr) groups[0].rides.push(ride);
      else if (d.toDateString() === tomorrowStr) groups[1].rides.push(ride);
      else if (d < weekEnd) groups[2].rides.push(ride);
      else groups[3].rides.push(ride);
    }
    return groups
      .filter((g) => g.rides.length > 0)
      .map((g) => ({
        ...g,
        sublabel: `${g.rides.length} course${g.rides.length > 1 ? "s" : ""}${
          g.rides.some((r) => r.distance_km != null)
            ? ` · ~${Math.round(g.rides.reduce((s, r) => s + (r.distance_km ?? 0), 0))} km`
            : ""
        }`,
      }));
  })();

  // Heartbeat toutes les 30 s quand le chauffeur est en ligne
  useEffect(() => {
    if (availability !== "online") return;
    updateHeartbeat().catch(() => {});
    const id = setInterval(() => updateHeartbeat().catch(() => {}), 30_000);
    const onUnload = () => navigator.sendBeacon?.("/api/noop"); // beacon placeholder
    window.addEventListener("beforeunload", onUnload);
    return () => { clearInterval(id); window.removeEventListener("beforeunload", onUnload); };
  }, [availability]);

  const acceptSeriesMutation = useMutation({
    mutationFn: acceptSeriesRides,
    onMutate: (rideId) => setAcceptingSeriesId(rideId),
    onSuccess: (_, rideId) => {
      toast({ title: "Toutes les séances acceptées !", variant: "success" });
      // Un seul email récap est envoyé côté serveur par accept_series — pas de boucle ici
      notifyBookingAcceptedServerFn({ data: { bookingId: rideId } }).catch((err) => {
        logger.warn("email.notifySeriesAccepted failed", { error: err.message, rideId });
      });
    },
    onSettled: () => {
      setAcceptingSeriesId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.acceptSeriesRides failed", { error: error.message, rideId });
      toast({ title: "Erreur série", description: error.message, variant: "error" });
    },
  });

  // Sound + vibration when a new ride appears in the pool
  useEffect(() => {
    const prev = prevPoolCountRef.current;
    prevPoolCountRef.current = poolRides.length;
    if (prev === null || availability !== "online") return;
    if (poolRides.length > prev) {
      if (soundEnabled) {
        try {
          if (!audioRef.current) audioRef.current = new Audio("/sounds/new-ride.wav");
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        } catch {}
      }
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [poolRides.length, availability, soundEnabled]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-brand-blue-700 text-white">
        <div className="container py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Tableau de bord chauffeur</h1>
              <p className="text-blue-200 text-sm mt-0.5">
                Bienvenue — Mon Taxi Santé
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="radiogroup"
                aria-label="Disponibilité"
                className="flex items-center gap-1 rounded-xl bg-white/10 border border-white/20 p-1"
              >
                {(
                  [
                    { value: "online" as const, label: "En ligne", icon: Circle },
                    { value: "paused" as const, label: "Pause", icon: Pause },
                    { value: "offline" as const, label: "Hors ligne", icon: PowerOff },
                  ]
                ).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={availability === value}
                    disabled={availabilityMutation.isPending}
                    onClick={() => availabilityMutation.mutate(value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                      availability === value
                        ? value === "online"
                          ? "bg-brand-green-500 text-white"
                          : "bg-white text-gray-900"
                        : "text-blue-100 hover:bg-white/10"
                    )}
                  >
                    <Icon
                      className={cn("h-3.5 w-3.5", availability === "online" && value === "online" && "fill-current")}
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                ))}
              </div>
              <Link
                to="/tableau-de-bord/chauffeur/compte"
                className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
                Mon compte
              </Link>
              <button
                onClick={() => {
                  const next = !soundEnabled;
                  setSoundEnabled(next);
                  try { localStorage.setItem("driver-sound", next ? "on" : "off"); } catch {}
                }}
                className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
                aria-pressed={soundEnabled}
                aria-label={soundEnabled ? "Désactiver le son" : "Activer le son"}
                title={soundEnabled ? "Son activé — cliquer pour désactiver" : "Son désactivé — cliquer pour activer"}
              >
                {soundEnabled ? (
                  <>
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-brand-green-400 animate-pulse" aria-hidden="true" />
                    Son activé
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4" aria-hidden="true" />
                    Son désactivé
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Stats avec sélecteur de période */}
        <section aria-labelledby="stats-heading">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 id="stats-heading" className="text-xl font-bold text-gray-900">Statistiques</h2>
            <div role="tablist" aria-label="Période" className="flex gap-0.5 rounded-lg bg-white ring-1 ring-gray-200 p-0.5 shadow-sm">
              {(["today", "week", "month", "total"] as const).map((p) => {
                const labels = { today: "Auj.", week: "7 jours", month: "30 jours", total: "Total" };
                return (
                  <button
                    key={p}
                    role="tab"
                    aria-selected={statsPeriod === p}
                    onClick={() => setStatsPeriod(p)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                      statsPeriod === p
                        ? "bg-brand-blue-600 text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    {labels[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const s = statsQuery.data;
            const p = periodStatsQuery.data;
            const rides = statsPeriod === "today" ? (s?.rides_today ?? 0)
              : statsPeriod === "total" ? (s?.rides_completed ?? 0)
              : (p?.rides ?? 0);
            const earnings = statsPeriod === "today" ? (s?.earnings_today ?? 0)
              : statsPeriod === "total" ? (s?.total_earnings ?? 0)
              : (p?.earnings ?? 0);
            const km = statsPeriod === "total" ? (s?.total_km ?? 0) : (p?.km ?? 0);
            const nextRide = myRides.find((r) => r.status === "accepted");
            return (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
                <StatCard icon={Car} label="Courses" value={rides} color="bg-brand-green-50 text-brand-green-600" />
                <StatCard icon={Wallet} label="Gains" value={formatPrice(earnings)} color="bg-brand-blue-50 text-brand-blue-600" />
                <StatCard icon={Gauge} label="Km parcourus" value={statsPeriod === "today" ? "—" : `${km} km`} color="bg-indigo-50 text-indigo-600" />
                <StatCard
                  icon={statsPeriod === "total" ? Star : Clock}
                  label={statsPeriod === "total" ? "Note moyenne" : "Prochaine course"}
                  value={
                    statsPeriod === "total"
                      ? (s?.average_rating != null ? `${s.average_rating} / 5` : "—")
                      : (nextRide
                          ? new Date(nextRide.pickup_datetime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                          : "—")
                  }
                  color="bg-amber-50 text-amber-600"
                />
              </div>
            );
          })()}
        </section>

        {/* Pool disponible — toujours visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <StatCard icon={Activity} label="Courses disponibles" value={poolRides.length} color="bg-brand-blue-50 text-brand-blue-600" />
          <StatCard icon={Star} label="Note moyenne" value={statsQuery.data?.average_rating != null ? `${statsQuery.data.average_rating} / 5` : "—"} color="bg-amber-50 text-amber-600" />
        </div>

        {/* Acceptance radius setting — chips instantanés */}
        <section aria-labelledby="radius-heading">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />
              <h2 id="radius-heading" className="text-sm font-bold text-gray-900">
                Rayon d'acceptation
              </h2>
              {radiusMutation.isPending && (
                <span className="text-xs text-gray-400">Enregistrement…</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Distance maximale entre votre stationnement et le départ d'une course. Illimité = toutes les courses.
            </p>
            <div role="group" aria-label="Rayon d'acceptation" className="flex flex-wrap gap-2">
              {([5, 10, 25, 50, null] as (number | null)[]).map((val) => {
                const label = val === null ? "Illimité" : `${val} km`;
                const current = availabilityQuery.data?.acceptance_radius_km ?? null;
                const isActive = current === val;
                return (
                  <button
                    key={String(val)}
                    type="button"
                    aria-pressed={isActive}
                    disabled={radiusMutation.isPending}
                    onClick={() => radiusMutation.mutate(val)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition-all border",
                      isActive
                        ? "bg-brand-blue-600 text-white border-brand-blue-600 shadow-sm"
                        : "bg-white text-gray-700 border-gray-200 hover:border-brand-blue-300 hover:bg-brand-blue-50"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Sections du tableau de bord"
          className="flex gap-1 rounded-xl bg-gray-200 p-1 max-w-xs"
        >
          {(["pool", "my_rides"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "pool" ? (
                <span className="flex items-center justify-center gap-1.5">
                  Pool
                  {poolRides.length > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-blue-600 text-white text-xs font-bold">
                      {poolRides.length}
                    </span>
                  )}
                </span>
              ) : (
                "Mes courses"
              )}
            </button>
          ))}
        </div>

        {/* Pool tab */}
        {tab === "pool" && (
          <section aria-labelledby="pool-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="pool-heading" className="text-xl font-bold text-gray-900">
                Courses disponibles
              </h2>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["ride-pool"] })}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label="Actualiser la liste des courses"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${poolQuery.isFetching ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Actualiser
              </button>
            </div>

            {poolQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue-600 border-t-transparent" aria-hidden="true" />
                <span className="ml-3 text-muted-foreground">Chargement des courses…</span>
              </div>
            ) : poolQuery.isError ? (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
                <p className="font-semibold">Impossible de charger le pool</p>
                <p className="text-sm mt-1">{poolQuery.error?.message}</p>
              </div>
            ) : isPoolSuspended ? (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-12 text-center">
                <ShieldAlert className="h-12 w-12 text-red-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-lg font-semibold text-red-800">
                  Accès au pool temporairement suspendu
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Suite à plusieurs annulations juste après acceptation, l'accès
                  aux courses disponibles est suspendu jusqu'au{" "}
                  {new Date(poolSuspendedUntil!).toLocaleString("fr-FR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                  .
                </p>
              </div>
            ) : availability !== "online" ? (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-12 text-center">
                <PowerOff className="h-12 w-12 text-amber-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-lg font-semibold text-amber-800">
                  Vous êtes {availability === "paused" ? "en pause" : "hors ligne"}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Passez « En ligne » en haut de la page pour voir les courses
                  disponibles.
                </p>
              </div>
            ) : poolRides.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-12 text-center">
                <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-lg font-semibold text-gray-700">
                  Aucune course disponible
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les nouvelles courses apparaissent ici en temps réel. Gardez
                  cette page ouverte.
                </p>
              </div>
            ) : (
              <PoolList
                rides={poolRides}
                onAccept={(id) => acceptMutation.mutate(id)}
                acceptingId={acceptingId}
                isAccepting={acceptMutation.isPending}
                onAcceptSeries={(id) => acceptSeriesMutation.mutate(id)}
                acceptingSeriesId={acceptingSeriesId}
                driverProfile={
                  availabilityQuery.data
                    ? {
                        vehicle_type: availabilityQuery.data.vehicle_type,
                        pmr_equipped: availabilityQuery.data.pmr_equipped,
                        stretcher_equipped: availabilityQuery.data.stretcher_equipped,
                        oxygen_equipped: availabilityQuery.data.oxygen_equipped,
                      }
                    : null
                }
              />
            )}
          </section>
        )}

        {/* My rides tab */}
        {tab === "my_rides" && (
          <section aria-labelledby="myrides-heading">
            <h2 id="myrides-heading" className="text-xl font-bold text-gray-900 mb-4">
              Mes courses acceptées
            </h2>

            {myRidesQuery.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue-600 border-t-transparent" aria-hidden="true" />
              </div>
            ) : myRides.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
                <p className="text-lg font-semibold text-gray-700">
                  Pas encore de course acceptée
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Acceptez une course dans le pool pour la voir apparaître ici.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {myRidesGrouped.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-baseline gap-2 mb-3">
                      <h3 className="text-base font-bold text-gray-900">{group.label}</h3>
                      <span className="text-xs text-gray-400">{group.sublabel}</span>
                    </div>
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 list-none">
                      {group.rides.map((ride) => (
                        <li key={ride.id}>
                          <RideCard
                            ride={ride}
                            onAccept={() => {}}
                            isAccepting={false}
                            onStart={(id) => startMutation.mutate(id)}
                            isStarting={startingId === ride.id && startMutation.isPending}
                            onComplete={(id) => completeMutation.mutate(id)}
                            isCompleting={completingId === ride.id && completeMutation.isPending}
                            onCancel={(id) => cancelMutation.mutate(id)}
                            isCancelling={cancellingId === ride.id && cancelMutation.isPending}
                            onRate={(id, rating, comment) => rateMutation.mutate({ rideId: id, rating, comment })}
                            isRating={ratingId === ride.id && rateMutation.isPending}
                            seriesRides={ride.series_id ? ridesBySeries[ride.series_id] : undefined}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
