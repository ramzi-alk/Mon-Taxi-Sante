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
  ClipboardCheck,
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
  const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : pickupDate;
  const minutesUntilPickup = useMinutesUntil(ride.pickup_datetime);
  const isUrgent = minutesUntilPickup >= 0 && minutesUntilPickup <= URGENT_THRESHOLD_MIN;
  const isCritical = minutesUntilPickup >= 0 && minutesUntilPickup <= 20;

  const needs = [
    ride.requires_wheelchair && "PMR",
    ride.requires_stretcher && "Brancard",
    ride.requires_oxygen && "Oxygène",
  ].filter(Boolean) as string[];

  const hasPriority =
    !!ride.priority_driver_id &&
    (!ride.priority_expires_at || new Date(ride.priority_expires_at) > new Date());

  const hasExpandableDetails =
    ride.is_hospitalization ||
    (!!ride.series_total && ride.series_total > 1) ||
    ride.pmt_declared != null;

  return (
    <article
      className={cn(
        "rounded-xl bg-white ring-1 ring-gray-200 transition-all hover:shadow-sm hover:ring-brand-blue-200 overflow-hidden",
        isUrgent && "ring-amber-300 bg-amber-50/30"
      )}
      aria-label={`Course disponible — ${ride.pickup_address} vers ${ride.dropoff_address}`}
    >
      {/* ── Main row ─────────────────────────────────────────────────────── */}
      <div className="flex items-stretch gap-0 sm:gap-3 sm:px-4 sm:py-2.5">

        {/* Col 1 — heure + type (desktop : colonne fixe, mobile : bandeau haut) */}
        <div
          className={cn(
            "flex shrink-0 flex-col justify-center gap-0.5 px-3 py-2.5 sm:px-0 sm:py-0 sm:min-w-[9rem]",
            isUrgent ? "bg-amber-50 sm:bg-transparent" : "bg-gray-50 sm:bg-transparent",
            "border-r border-gray-100 sm:border-0"
          )}
        >
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs font-bold whitespace-nowrap",
              isUrgent ? "text-amber-800" : "text-gray-900"
            )}
          >
            <Clock
              className={cn("h-3.5 w-3.5 shrink-0", isUrgent ? "text-amber-600" : "text-brand-blue-500")}
              aria-hidden="true"
            />
            <time dateTime={ride.pickup_datetime}>
              {dayLabel}
            </time>
          </span>
          <span className="pl-5 text-xs text-gray-500 font-medium">{pickupTime}</span>
          {isUrgent && (
            <span
              className={cn(
                "pl-5 text-xs font-semibold",
                isCritical ? "text-red-600 animate-pulse" : "text-amber-600"
              )}
            >
              Dans {Math.max(0, Math.round(minutesUntilPickup))} min
            </span>
          )}
          <span className="pl-5 mt-0.5 flex items-center gap-1 text-xs font-semibold text-gray-400">
            <span aria-hidden="true">{vehicleIcons[ride.vehicle_type]}</span>
            {ride.vehicle_type.toUpperCase()}
          </span>
        </div>

        {/* Col 2 — trajet + badges */}
        <div className="flex-1 min-w-0 px-3 py-2.5 sm:px-0 sm:py-0 flex flex-col justify-center gap-1.5">
          {/* Adresses */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <Navigation className="h-3.5 w-3.5 shrink-0 text-brand-blue-500 mt-0.5" aria-hidden="true" />
              <AddressLink
                address={ride.pickup_address}
                lat={ride.pickup_lat}
                lng={ride.pickup_lng}
                className="truncate text-sm font-medium text-gray-900"
              />
              {ride.distance_to_driver_km != null && (
                <span className="shrink-0 text-xs font-semibold text-gray-400 ml-auto pl-1">
                  {ride.distance_to_driver_km} km
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" aria-hidden="true" />
              <AddressLink
                address={ride.dropoff_address}
                lat={ride.dropoff_lat}
                lng={ride.dropoff_lng}
                className="truncate text-sm font-medium text-gray-900"
              />
              {ride.distance_km != null && (
                <span className="shrink-0 text-xs font-semibold text-gray-400 ml-auto pl-1">
                  {ride.distance_km} km
                </span>
              )}
            </div>
          </div>

          {/* Badges inline */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {ride.passenger_count} passager{ride.passenger_count > 1 ? "s" : ""}
            </span>
            {ride.trip_type === "aller_retour" && (
              <span className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-semibold text-brand-blue-700">
                A/R
              </span>
            )}
            {hasPriority && (
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                Priorité série
              </span>
            )}
            {needs.map((n) => (
              <span key={n} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {n}
              </span>
            ))}
            {ride.pmt_declared != null && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                PMT : {ride.pmt_declared ? "oui" : "non"}
              </span>
            )}
          </div>

          {/* Voir plus */}
          {hasExpandableDetails && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1 text-xs font-semibold text-brand-blue-700 hover:underline w-fit"
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              )}
              {expanded ? "Voir moins" : "Voir plus de détails"}
            </button>
          )}
        </div>

        {/* Col 3 — prix + bouton (desktop) */}
        <div className="hidden sm:flex shrink-0 flex-col items-end justify-center gap-2 py-2.5">
          {ride.estimated_price != null && (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 whitespace-nowrap">
              ~{ride.estimated_price.toFixed(2).replace(".", ",")} €
            </span>
          )}
          <button
            type="button"
            onClick={() => onAccept(ride.id)}
            disabled={isAccepting}
            aria-label={`Accepter — ${ride.pickup_address} vers ${ride.dropoff_address}`}
            aria-busy={isAccepting}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap",
              isAccepting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand-green-600 hover:bg-brand-green-700 shadow-sm active:scale-95"
            )}
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Car className="h-4 w-4" aria-hidden="true" />
            )}
            Accepter
          </button>
        </div>
      </div>

      {/* ── Mobile : barre prix + bouton ─────────────────────────────────── */}
      <div className="flex sm:hidden items-center justify-between gap-2 px-3 pb-2.5">
        {ride.estimated_price != null ? (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
            ~{ride.estimated_price.toFixed(2).replace(".", ",")} €
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => onAccept(ride.id)}
          disabled={isAccepting}
          aria-label={`Accepter — ${ride.pickup_address} vers ${ride.dropoff_address}`}
          aria-busy={isAccepting}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isAccepting
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-brand-green-600 hover:bg-brand-green-700 shadow-sm active:scale-95"
          )}
        >
          {isAccepting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Car className="h-4 w-4" aria-hidden="true" />
          )}
          Accepter
        </button>
      </div>

      {/* ── Détails expandables ───────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 mx-3 sm:mx-4 mb-2.5 pt-2.5">
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 space-y-1.5 text-xs text-gray-700">
            {ride.pmt_declared != null && (
              <p className="flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                PMT déclarée : <span className="font-semibold">{ride.pmt_declared ? "Oui" : "Non"}</span>
              </p>
            )}
            {ride.is_hospitalization && (
              <p className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                Hospitalisation
              </p>
            )}
            {!!ride.series_total && ride.series_total > 1 && (
              <p className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                Séance {ride.series_index}/{ride.series_total}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
