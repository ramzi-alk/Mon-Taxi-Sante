import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Car,
  CheckCircle2,
  Clock,
  RefreshCw,
  Bell,
  BellOff,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "~/lib/supabase";
import { logger } from "~/lib/logger";
import { useRealtime } from "~/hooks/useRealtime";
import { RideCard, type PoolRide } from "~/components/driver/RideCard";

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
  const { data, error } = await supabase
    .from("bookings_pool_for_drivers")
    .select("*")
    .eq("status", "available")
    .order("pickup_datetime", { ascending: true });

  if (error) {
    logger.error("driver.fetchRidePool failed", { error: error.message });
    throw new Error(error.message);
  }
  return (data ?? []) as PoolRide[];
}

async function fetchMyRides(): Promise<PoolRide[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, driver_id, patient_full_name, patient_phone, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance_km, pickup_datetime, return_datetime, vehicle_type, trip_type, requires_wheelchair, requires_stretcher, requires_oxygen, passenger_count, estimated_price, status, created_at"
    )
    .eq("driver_id", user.id)
    .in("status", ["accepted", "in_progress", "completed"])
    .order("pickup_datetime", { ascending: false })
    .limit(20);

  if (error) {
    logger.error("driver.fetchMyRides failed", { error: error.message });
    throw new Error(error.message);
  }

  // Map to PoolRide shape (rename patient_full_name → patient_first_name)
  return (data ?? []).map((r) => ({
    ...r,
    patient_first_name: r.patient_full_name?.split(" ")[0] ?? "—",
  })) as unknown as PoolRide[];
}

async function acceptRide(rideId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("bookings")
    .update({ driver_id: user.id, status: "accepted" })
    .eq("id", rideId)
    .eq("status", "available"); // optimistic lock — only update if still available

  if (error) {
    logger.error("driver.acceptRide failed", { error: error.message, rideId });
    throw new Error(error.message);
  }
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
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

function DriverDashboard() {
  const queryClient = useQueryClient();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [tab, setTab] = useState<"pool" | "my_rides">("pool");

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
    onSettled: () => {
      setAcceptingId(null);
      queryClient.invalidateQueries({ queryKey: ["ride-pool"] });
      queryClient.invalidateQueries({ queryKey: ["my-rides"] });
    },
    onError: (error) => {
      alert(`Erreur : ${error.message}. La course a peut-être déjà été prise.`);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Tableau de bord chauffeur</h1>
              <p className="text-blue-200 text-sm mt-0.5">
                Bienvenue — Mon Taxi Santé
              </p>
            </div>
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

      <div className="container py-8 space-y-8">
        {/* Stats */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Statistiques du jour
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              value={myRides.filter((r) => r.status === "completed").length}
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
