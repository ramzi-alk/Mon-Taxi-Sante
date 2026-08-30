import { useMemo, lazy, Suspense } from "react";
import { Clock, ArrowDown, AlertTriangle } from "lucide-react";
import { formatTimeFr, cn } from "~/lib/utils";
import type { PoolRide } from "./RideCard";
import type { RideMapMarker } from "./RideMap";

// Voir PoolList.tsx : mapbox-gl (~1 Mo) est chargé en lazy, pas statiquement.
const RideMap = lazy(() => import("./RideMap").then((m) => ({ default: m.RideMap })));

// Même formule que la détection de chevauchement côté serveur (accept_ride,
// migration 056) : ~2 min/km, plancher 20 min, pour rester cohérent entre ce
// qui est affiché ici et ce qui est réellement bloqué à l'acceptation.
function estimatedDurationMin(distanceKm: number | null): number {
  return Math.max(20, Math.ceil((distanceKm ?? 0) * 2));
}

function busyWindow(ride: PoolRide): { start: Date; end: Date } {
  const start = new Date(ride.pickup_datetime);
  const returnStart = ride.return_datetime ? new Date(ride.return_datetime) : start;
  const anchor = returnStart > start ? returnStart : start;
  const end = new Date(anchor.getTime() + estimatedDurationMin(ride.distance_km) * 60_000);
  return { start, end };
}

function formatGap(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

interface DayTimelineProps {
  rides: PoolRide[];
  driverLat?: number | null;
  driverLng?: number | null;
}

// Résumé visuel du planning du jour, complémentaire aux RideCard
// individuelles (qui restent le moyen d'action). accept_ride bloque déjà les
// chevauchements francs à l'acceptation (migration 056) — cette frise reste
// utile pour les courses acceptées avant ce garde-fou, et pour donner une
// vision d'ensemble du temps de battement réel entre deux courses plutôt que
// de le laisser implicite dans une simple liste.
export function DayTimeline({ rides, driverLat, driverLng }: DayTimelineProps) {
  const sorted = [...rides]
    .filter((r) => r.status === "accepted" || r.status === "in_progress")
    .sort((a, b) => new Date(a.pickup_datetime).getTime() - new Date(b.pickup_datetime).getTime());

  // Itinéraire du jour : pickup puis dropoff de chaque course, dans l'ordre
  // chronologique. Un pickup pas encore révélé (voir bookingMasking.ts —
  // adresse masquée jusqu'à l'approche du rendez-vous) n'a pas de
  // coordonnées : on saute juste ce point plutôt que de deviner.
  const { markers, routeOrder } = useMemo(() => {
    const m: RideMapMarker[] = [];
    const order: string[] = [];
    if (driverLat != null && driverLng != null) {
      m.push({ id: "driver", lat: driverLat, lng: driverLng, kind: "driver", label: "Vous" });
      order.push("driver");
    }
    for (const ride of sorted) {
      if (ride.pickup_lat != null && ride.pickup_lng != null) {
        const id = `${ride.id}-pickup`;
        m.push({ id, lat: ride.pickup_lat, lng: ride.pickup_lng, kind: "pickup", label: `${formatTimeFr(ride.pickup_datetime)} — ${ride.pickup_address}` });
        order.push(id);
      }
      if (ride.dropoff_lat != null && ride.dropoff_lng != null) {
        const id = `${ride.id}-dropoff`;
        m.push({ id, lat: ride.dropoff_lat, lng: ride.dropoff_lng, kind: "dropoff", label: ride.dropoff_address });
        order.push(id);
      }
    }
    return { markers: m, routeOrder: order };
  }, [sorted, driverLat, driverLng]);

  if (sorted.length < 2) return null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />
        <h3 className="text-sm font-bold text-gray-900">Ma journée</h3>
      </div>
      <ol className="space-y-0 list-none">
        {sorted.map((ride, i) => {
          const { start, end } = busyWindow(ride);
          const next = sorted[i + 1];
          const gapMin = next ? (new Date(next.pickup_datetime).getTime() - end.getTime()) / 60_000 : null;

          return (
            <li key={ride.id}>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-0.5">
                  <span className={cn(
                    "h-2.5 w-2.5 rounded-full shrink-0",
                    ride.status === "in_progress" ? "bg-brand-blue-500" : "bg-gray-300"
                  )} />
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-xs font-bold text-gray-900">
                    {formatTimeFr(ride.pickup_datetime)}
                    <span className="ml-1.5 font-normal text-gray-400">→ {ride.dropoff_address}</span>
                  </p>
                </div>
              </div>

              {gapMin != null && (
                <div className="flex items-center gap-3 py-1">
                  <div className="flex w-2.5 justify-center shrink-0">
                    <ArrowDown className="h-3 w-3 text-gray-300" aria-hidden="true" />
                  </div>
                  <p
                    className={cn(
                      "flex items-center gap-1 text-[11px] font-semibold",
                      gapMin < 0
                        ? "text-red-600"
                        : gapMin < 20
                        ? "text-amber-600"
                        : "text-gray-400"
                    )}
                  >
                    {gapMin < 20 && <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />}
                    {gapMin < 0
                      ? `Chevauchement estimé de ${formatGap(-gapMin)}`
                      : gapMin < 20
                      ? `Seulement ${formatGap(gapMin)} avant la course suivante`
                      : `${formatGap(gapMin)} de battement`}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11px] text-gray-400">
        Battement estimé à partir de la distance (~2 min/km) — pas un calcul d'itinéraire réel.
      </p>
      {markers.length > 1 && (
        <div className="mt-3">
          <Suspense fallback={<div className="h-[200px] w-full rounded-2xl bg-gray-100 animate-pulse" />}>
            <RideMap markers={markers} routeOrder={routeOrder} height="200px" />
          </Suspense>
        </div>
      )}
    </div>
  );
}
