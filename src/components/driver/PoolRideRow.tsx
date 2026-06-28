import { Clock, Users, Navigation, MapPin, Loader2, Car } from "lucide-react";
import { formatDateFr, formatTimeFr, cn } from "~/lib/utils";
import { AddressLink, vehicleIcons, type PoolRide } from "./RideCard";

interface PoolRideRowProps {
  ride: PoolRide;
  onAccept: (rideId: string) => void;
  isAccepting: boolean;
}

const URGENT_THRESHOLD_MIN = 45;

export function PoolRideRow({ ride, onAccept, isAccepting }: PoolRideRowProps) {
  const pickupDate = formatDateFr(ride.pickup_datetime);
  const pickupTime = formatTimeFr(ride.pickup_datetime);
  const now = Date.now();
  const pickupMs = new Date(ride.pickup_datetime).getTime();
  const isToday = new Date(ride.pickup_datetime).toDateString() === new Date().toDateString();
  const isTomorrow =
    new Date(ride.pickup_datetime).toDateString() ===
    new Date(Date.now() + 86400000).toDateString();
  const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : pickupDate;
  const minutesUntilPickup = (pickupMs - now) / 60000;
  const isUrgent = minutesUntilPickup >= 0 && minutesUntilPickup <= URGENT_THRESHOLD_MIN;

  const needs = [
    ride.requires_wheelchair && "PMR",
    ride.requires_stretcher && "Brancard",
    ride.requires_oxygen && "Oxygène",
  ].filter(Boolean) as string[];

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-gray-200 transition-all hover:shadow-sm hover:ring-brand-blue-200 sm:flex-row sm:items-center sm:gap-4",
        isUrgent && "ring-amber-300 bg-amber-50/40"
      )}
      aria-label={`Course disponible — ${ride.pickup_address} vers ${ride.dropoff_address}`}
    >
      {/* Heure */}
      <div className="flex items-center gap-2 sm:w-28 sm:shrink-0">
        <Clock
          className={cn("h-4 w-4 shrink-0", isUrgent ? "text-amber-600" : "text-brand-blue-500")}
          aria-hidden="true"
        />
        <div className="leading-tight">
          <p className={cn("text-sm font-bold", isUrgent ? "text-amber-800" : "text-gray-900")}>
            {dayLabel}
          </p>
          <p className="text-xs text-gray-500">
            <time dateTime={ride.pickup_datetime}>{pickupTime}</time>
          </p>
        </div>
      </div>

      {/* Véhicule */}
      <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 sm:w-16 sm:shrink-0">
        <span aria-hidden="true">{vehicleIcons[ride.vehicle_type]}</span>
        {ride.vehicle_type.toUpperCase()}
      </span>

      {/* Trajet */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline gap-1.5">
          <Navigation className="h-3.5 w-3.5 shrink-0 text-brand-blue-500" aria-hidden="true" />
          <AddressLink
            address={ride.pickup_address}
            lat={ride.pickup_lat}
            lng={ride.pickup_lng}
            className="truncate text-sm font-medium text-gray-900"
          />
          {ride.distance_to_driver_km != null && (
            <span className="shrink-0 text-xs font-semibold text-gray-400">
              {ride.distance_to_driver_km} km
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden="true" />
          <AddressLink
            address={ride.dropoff_address}
            lat={ride.dropoff_lat}
            lng={ride.dropoff_lng}
            className="truncate text-sm font-medium text-gray-900"
          />
          {ride.distance_km != null && (
            <span className="shrink-0 text-xs font-semibold text-gray-400">{ride.distance_km} km</span>
          )}
        </div>
      </div>

      {/* Conformité / besoins */}
      <div className="flex flex-wrap items-center gap-1.5 sm:w-44 sm:shrink-0">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {ride.passenger_count}
        </span>
        {ride.trip_type === "aller_retour" && (
          <span className="rounded-full bg-brand-blue-50 px-2 py-0.5 text-xs font-semibold text-brand-blue-700">
            A/R
          </span>
        )}
        {needs.map((n) => (
          <span
            key={n}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700"
          >
            {n}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onAccept(ride.id)}
        disabled={isAccepting}
        aria-label={`Accepter la course — ${ride.pickup_address} vers ${ride.dropoff_address}`}
        aria-busy={isAccepting}
        className={cn(
          "flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto",
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
    </article>
  );
}
