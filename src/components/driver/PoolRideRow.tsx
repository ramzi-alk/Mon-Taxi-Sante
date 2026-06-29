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

interface PoolRideRowProps {
  ride: PoolRide;
  onAccept: (rideId: string) => void;
  isAccepting: boolean;
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

export function PoolRideRow({ ride, onAccept, isAccepting }: PoolRideRowProps) {
  const [expanded, setExpanded] = useState(false);

  const pickupDate = formatDateFr(ride.pickup_datetime);
  const pickupTime = formatTimeFr(ride.pickup_datetime);
  const isToday = new Date(ride.pickup_datetime).toDateString() === new Date().toDateString();
  const isTomorrow =
    new Date(ride.pickup_datetime).toDateString() ===
    new Date(Date.now() + 86400000).toDateString();
  const dayLabel = isToday ? "Auj." : isTomorrow ? "Dem." : pickupDate;

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
      {/* ── Ligne 1 : heure | adresses | bouton accepter ─────────────── */}
      <div className="flex items-start gap-2 px-3 pt-2.5 pb-1">

        {/* Heure + type — 72 px fixes */}
        <div className="w-[72px] shrink-0 flex flex-col gap-0 pt-px">
          <span className={cn("text-xs font-bold whitespace-nowrap leading-tight", isUrgent ? "text-amber-800" : "text-gray-900")}>
            <Clock className={cn("inline h-3 w-3 mr-0.5 -mt-px", isUrgent ? "text-amber-500" : "text-brand-blue-500")} aria-hidden="true" />
            {dayLabel}
          </span>
          <span className="text-xs text-gray-500 leading-tight">{pickupTime}</span>
          {isUrgent && (
            <span className={cn("text-[10px] font-semibold leading-tight mt-0.5", isCritical ? "text-red-600 animate-pulse" : "text-amber-600")}>
              Dans {Math.max(0, Math.round(minutesUntilPickup))} min
            </span>
          )}
          <span className="text-[10px] text-gray-400 leading-tight mt-0.5">
            {vehicleIcons[ride.vehicle_type]} {ride.vehicle_type.toUpperCase()}
          </span>
        </div>

        {/* Adresses — flex-1, distance en bout de ligne */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline justify-between gap-1">
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
              <span className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap ml-1">{ride.distance_to_driver_km} km</span>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1">
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
              <span className="shrink-0 text-[10px] text-gray-400 whitespace-nowrap ml-1">{ride.distance_km} km</span>
            )}
          </div>
        </div>

        {/* Accepter */}
        <button
          type="button"
          onClick={() => onAccept(ride.id)}
          disabled={isAccepting}
          aria-label={`Accepter — ${ride.pickup_address} → ${ride.dropoff_address}`}
          aria-busy={isAccepting}
          className={cn(
            "shrink-0 flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 whitespace-nowrap mt-px",
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

      {/* ── Ligne 2 : badges | passagers + prix + expand ─────────────── */}
      {/* indentée pour s'aligner avec la colonne adresses */}
      <div
        className="flex items-center justify-between gap-2 pb-2 pr-3"
        style={{ paddingLeft: "calc(0.75rem + 72px + 0.5rem)" }}
      >
        {/* badges */}
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

        {/* passagers + prix + expand */}
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
    </article>
  );
}
