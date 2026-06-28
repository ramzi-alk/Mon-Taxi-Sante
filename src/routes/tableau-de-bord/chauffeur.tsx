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
  Gauge,
  Wallet,
  MapPin,
  UserCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "~/lib/supabase";
import { cn, formatPrice } from "~/lib/utils";
import { useRealtime } from "~/hooks/useRealtime";
import { RideCard, type PoolRide } from "~/components/driver/RideCard";
import { Input } from "~/components/ui/input";
import * as authRepository from "~/repositories/authRepository";
import * as bookingsRepository from "~/repositories/bookingsRepository";
import * as driversRepository from "~/repositories/driversRepository";
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

async function startRide(rideId: string): Promise<void> {
  await bookingsRepository.startRide(supabase, rideId);
}

async function completeRide(rideId: string): Promise<void> {
  await bookingsRepository.completeRide(supabase, rideId);
}

async function cancelRideByDriver(rideId: string): Promise<void> {
  await bookingsRepository.cancelRideByDriver(supabase, rideId);
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
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [tab, setTab] = useState<"pool" | "my_rides">("pool");

  // Driver's own online/paused/offline status — the pool only shows rides
  // to drivers who are "online" (see migration 018).
  const availabilityQuery = useQuery({
    queryKey: ["my-availability"],
    queryFn: fetchMyAvailability,
  });
  const availability = availabilityQuery.data?.availability ?? "offline";

  const statsQuery = useQuery({
    queryKey: ["my-driver-stats"],
    queryFn: fetchMyDriverStats,
  });

  const [radiusInput, setRadiusInput] = useState("");
  useEffect(() => {
    setRadiusInput(availabilityQuery.data?.acceptance_radius_km?.toString() ?? "");
  }, [availabilityQuery.data?.acceptance_radius_km]);

  const radiusMutation = useMutation({
    mutationFn: setAcceptanceRadius,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-availability"] });
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
    },
    onError: (error) => {
      logger.error("driver.setAcceptanceRadius failed", { error: error.message });
      alert(`Erreur : ${error.message}`);
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
      alert(`Erreur : ${error.message}`);
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
      alert(`Erreur : ${error.message}. La course a peut-être déjà été prise.`);
    },
  });

  const startMutation = useMutation({
    mutationFn: startRide,
    onMutate: (rideId) => setStartingId(rideId),
    onSettled: () => {
      setStartingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.startRide failed", { error: error.message, rideId });
      alert(`Erreur : ${error.message}`);
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeRide,
    onMutate: (rideId) => setCompletingId(rideId),
    onSettled: () => {
      setCompletingId(null);
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error, rideId) => {
      logger.error("driver.completeRide failed", { error: error.message, rideId });
      alert(`Erreur : ${error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelRideByDriver,
    onMutate: (rideId) => setCancellingId(rideId),
    onSuccess: (_, rideId) => {
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
      alert(`Erreur : ${error.message}`);
    },
  });

  const poolRides = poolQuery.data ?? [];
  const myRides = myRidesQuery.data ?? [];
  const todayRides = myRides.filter(
    (r) =>
      new Date(r.pickup_datetime).toDateString() === new Date().toDateString()
  );

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
                onClick={() => setRealtimeEnabled(!realtimeEnabled)}
                className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/20 transition-colors"
                aria-pressed={realtimeEnabled}
                aria-label={
                  realtimeEnabled
                    ? "Désactiver les mises à jour en temps réel"
                    : "Activer les mises à jour en temps réel"
                }
              >
                {realtimeEnabled ? (
                  <>
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-brand-green-400 animate-pulse" aria-hidden="true" />
                    Temps réel actif
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4" aria-hidden="true" />
                    Temps réel désactivé
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Stats */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Statistiques du jour
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            <StatCard
              icon={Activity}
              label="Courses disponibles"
              value={poolRides.length}
              color="bg-brand-blue-50 text-brand-blue-600"
            />
            <StatCard
              icon={Car}
              label="Mes courses aujourd'hui"
              value={todayRides.length}
              color="bg-brand-green-50 text-brand-green-600"
            />
            <StatCard
              icon={CheckCircle2}
              label="Courses terminées (total)"
              value={statsQuery.data?.rides_completed ?? 0}
              color="bg-purple-50 text-purple-600"
            />
            <StatCard
              icon={Clock}
              label="Prochaine course"
              value={
                myRides.find((r) => r.status === "accepted")
                  ? new Date(
                      myRides.find((r) => r.status === "accepted")!.pickup_datetime
                    ).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                  : "—"
              }
              color="bg-amber-50 text-amber-600"
            />
          </div>
        </section>

        {/* Earnings */}
        <section aria-labelledby="earnings-heading">
          <h2 id="earnings-heading" className="sr-only">
            Kilomètres et gains
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
            <StatCard
              icon={Gauge}
              label="Km parcourus (total)"
              value={`${statsQuery.data?.total_km ?? 0} km`}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              icon={Wallet}
              label="Gains totaux"
              value={formatPrice(statsQuery.data?.total_earnings ?? 0)}
              color="bg-brand-green-50 text-brand-green-600"
            />
            <StatCard
              icon={Wallet}
              label="Gains aujourd'hui"
              value={formatPrice(statsQuery.data?.earnings_today ?? 0)}
              color="bg-brand-blue-50 text-brand-blue-600"
            />
          </div>
        </section>

        {/* Acceptance radius setting */}
        <section aria-labelledby="radius-heading">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />
              <h2 id="radius-heading" className="text-sm font-bold text-gray-900">
                Rayon d'acceptation
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Distance maximale (km) entre votre commune de stationnement et le
              point de départ d'une course pour qu'elle apparaisse dans votre
              pool. Laissez vide pour aucune limite.
            </p>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = radiusInput.trim();
                radiusMutation.mutate(trimmed === "" ? null : Number(trimmed));
              }}
            >
              <Input
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                value={radiusInput}
                onChange={(e) => setRadiusInput(e.target.value)}
                placeholder="Aucune limite"
                aria-label="Rayon d'acceptation en kilomètres"
                className="max-w-[160px]"
              />
              <button
                type="submit"
                disabled={radiusMutation.isPending}
                className="rounded-xl bg-brand-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-700 disabled:opacity-60 transition-colors"
              >
                {radiusMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </form>
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
              <ul
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 list-none"
                aria-label="Liste des courses disponibles"
              >
                {poolRides.map((ride) => (
                  <li key={ride.id}>
                    <RideCard
                      ride={ride}
                      onAccept={(id) => acceptMutation.mutate(id)}
                      isAccepting={acceptingId === ride.id && acceptMutation.isPending}
                    />
                  </li>
                ))}
              </ul>
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
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 list-none">
                {myRides.map((ride) => (
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
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
