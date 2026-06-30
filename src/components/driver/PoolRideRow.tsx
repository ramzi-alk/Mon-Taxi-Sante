import {
  Clock,
  Users,
  Navigation,
  MapPin,
  Loader2,
  Car,
  Banknote,
  ChevronDown,
  ChevronUp,
  Building2,
  Repeat,
} from "lucide-react";
import { formatDateFr, formatTimeFr, cn } from "~/lib/utils";
import { useEffect, useState } from "react";
import { AddressLink, vehicleIcons, type PoolRide } from "./RideCard";
import { SeriesRideSelectPanel } from "./SeriesRideSelectPanel";

interface PoolRideRowProps {
  ride: PoolRide;
  onAccept: (rideId: string) => void;
  isAccepting: boolean;
  onAcceptSeries?: (rideIds: string[]) => void;
  isAcceptingSeries?: boolean;
  seriesPoolRides?: PoolRide[];
}

const URGENT_THRESHOLD_MIN = 45;

function useMinutesUntil(datetimeStr: string) {
  const [minutes, setMinutes] = useState(() =>
    (new Date(datetimeStr).getTime() - Date.now()) / 60000
  );
  useEffect(() => {
    const id = setInterval(() => {
      setMinutes((new Date(datetimeStr).getTime() - Date.now()) / 60000);
    }, 30_000);
    return () => clearInterval(id);
  }, [datetimeStr]);
  return minutes;
}

export function PoolRideRow({ ride, onAccept, isAccepting, onAcceptSeries, isAcceptingSeries, seriesPoolRides }: PoolRideRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [seriesSelectOpen, setSeriesSelectOpen] = useState(false);

  const selectableSeriesRides = seriesPoolRides && seriesPoolRides.length > 1 ? seriesPoolRides : null;

  const pickupDate = formatDateFr(ride.pickup_datetime);
  const pickupTime = formatTimeFr(ride.pickup_datetime);
  const isToday = new Date(ride.pickup_datetime).toDateString() === new Date().toDateString();
  const isTomorrow =
    new Date(ride.pickup_datetime).toDateString() ===
    new Date(Date.now() + 86400000).toDateString();
  const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : pickupDate;

  const minutesUntilPickup = useMinutesUntil(ride.pickup_datetime);
  const isUrgent = minutesUntilPickup >= 0 && minutesUntilPickup <= URGENT_THRESHOLD_MIN;
  const isCritical = minutesUntilPickup >= 0 && minutesUntilPickup <= 20;

  const needs = [
    ride.requires_wheelchair && "PMR",
    ride.requires_stretcher && "Brancard",
    ride.requires_oxygen && "O₂",
  ].filter(Boolean) as string[];

  const hasPriority =
    !!ride.priority_driver_id &&
    (!ride.priority_expires_at || new Date(ride.priority_expires_at) > new Date());

  const hasExpandableDetails =
    ride.is_hospitalization || (!!ride.series_total && ride.series_total > 1);

  return (
    <article
      className={cn(
        "rounded-xl bg-white ring-1 ring-gray-200 transition-all hover:shadow-sm hover:ring-brand-blue-200 overflow-hidden",
        isUrgent && "ring-amber-300 bg-amber-50/30"
      )}
      aria-label={`Course — ${ride.pickup_address} → ${ride.dropoff_address}`}
    >
      {/* ── Ligne 1 : date · heure · type · countdown | Accepter ──────── */}
      <div className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5 border-b",
        isUrgent ? "border-amber-200 bg-amber-50/60" : "border-gray-100 bg-gray-50/60"
      )}>
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <Clock className={cn("h-3 w-3 shrink-0", isUrgent ? "text-amber-500" : "text-brand-blue-500")} aria-hidden="true" />
          <span className={cn("text-xs font-bold whitespace-nowrap", isUrgent ? "text-amber-800" : "text-gray-900")}>
            {dayLabel}
          </span>
          <span className="text-xs text-gray-600 whitespace-nowrap">{pickupTime}</span>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {vehicleIcons[ride.vehicle_type]} {ride.vehicle_type.toUpperCase()}
          </span>
          {isUrgent && (
            <span className={cn("text-[10px] font-bold whitespace-nowrap", isCritical ? "text-red-600 animate-pulse" : "text-amber-600")}>
              · Dans {Math.max(0, Math.round(minutesUntilPickup))} min
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onAccept(ride.id)}
          disabled={isAccepting}
          aria-label={`Accepter — ${ride.pickup_address} → ${ride.dropoff_address}`}
          aria-busy={isAccepting}
          className={cn(
            "shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            isAccepting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-brand-green-600 hover:bg-brand-green-700 shadow-sm active:scale-95"
          )}
        >
          {isAccepting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : <Car className="h-3.5 w-3.5" aria-hidden="true" />
          }
          Accepter
        </button>
      </div>

      {/* ── Lignes 2 : adresses pleine largeur ───────────────────────── */}
      <div className="px-3 pt-2 pb-1 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-start gap-1 min-w-0">
            <Navigation className="h-3 w-3 shrink-0 text-brand-blue-400 mt-0.5" aria-hidden="true" />
            <AddressLink
              address={ride.pickup_address}
              lat={ride.pickup_lat}
              lng={ride.pickup_lng}
              className="text-xs font-medium text-gray-900 break-words"
            />
          </div>
          {ride.distance_to_driver_km != null && (
            <span className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap">{ride.distance_to_driver_km} km</span>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-start gap-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
            <AddressLink
              address={ride.dropoff_address}
              lat={ride.dropoff_lat}
              lng={ride.dropoff_lng}
              className="text-xs font-medium text-gray-700 break-words"
            />
          </div>
          {ride.distance_km != null && (
            <span className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap">{ride.distance_km} km</span>
          )}
        </div>
      </div>

      {/* ── Ligne 3 : badges | passagers · prix · expand ─────────────── */}
      <div className="flex items-center justify-between gap-2 px-3 pb-2">
        <div className="flex flex-wrap items-center gap-1">
          {ride.pmt_declared && (
            <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">PMT</span>
          )}
          {ride.trip_type === "aller_retour" && (
            <span className="rounded-full bg-brand-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue-700">A/R</span>
          )}
          {hasPriority && (
            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">Prio</span>
          )}
          {needs.map((n) => (
            <span key={n} className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{n}</span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
            <Users className="h-3 w-3" aria-hidden="true" />
            {ride.passenger_count}
          </span>
          {ride.estimated_price != null && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 whitespace-nowrap">
              <Banknote className="h-3 w-3" aria-hidden="true" />
              ~{ride.estimated_price.toFixed(2).replace(".", ",")}€
            </span>
          )}
          {hasExpandableDetails && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? "Masquer les détails" : "Voir plus de détails"}
              className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-600 transition-colors rounded px-1 py-0.5 hover:bg-gray-100"
            >
              {expanded ? "Moins" : "Détails"}
              {expanded
                ? <ChevronUp className="h-3 w-3" aria-hidden="true" />
                : <ChevronDown className="h-3 w-3" aria-hidden="true" />
              }
            </button>
          )}
          {onAcceptSeries && selectableSeriesRides && (
            <button
              type="button"
              onClick={() => setSeriesSelectOpen((v) => !v)}
              disabled={isAcceptingSeries || isAccepting}
              aria-label={`Choisir parmi les ${selectableSeriesRides.length} séances de la série`}
              className={cn(
                "shrink-0 flex items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-bold transition-all",
                (isAcceptingSeries || isAccepting)
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : seriesSelectOpen
                  ? "bg-violet-200 text-violet-800"
                  : "bg-violet-100 text-violet-700 hover:bg-violet-200"
              )}
            >
              {isAcceptingSeries
                ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                : <Repeat className="h-3 w-3" aria-hidden="true" />
              }
              {selectableSeriesRides.length}/{ride.series_total} séances
            </button>
          )}
        </div>
      </div>

      {/* ── Détails expandables ───────────────────────────────────────── */}
      {expanded && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-1.5 text-xs text-gray-600">
            {ride.is_hospitalization && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" aria-hidden="true" />
                Hospitalisation
              </span>
            )}
            {!!ride.series_total && ride.series_total > 1 && (
              <span className="flex items-center gap-1">
                <Repeat className="h-3 w-3" aria-hidden="true" />
                Séance {ride.series_index}/{ride.series_total}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Sélection séances à accepter ─────────────────────────────── */}
      {seriesSelectOpen && selectableSeriesRides && onAcceptSeries && (
        <div className="px-3 pb-3">
          <SeriesRideSelectPanel
            rides={selectableSeriesRides}
            mode="accept"
            isSubmitting={!!isAcceptingSeries}
            onConfirm={(ids) => { onAcceptSeries(ids); setSeriesSelectOpen(false); }}
            onClose={() => setSeriesSelectOpen(false)}
          />
        </div>
      )}
    </article>
  );
}
