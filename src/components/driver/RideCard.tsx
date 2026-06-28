import { useState } from "react";
import { MapPin, Clock, Car, Users, Navigation, Loader2, PlayCircle, FlagTriangleRight, XCircle, User, Phone } from "lucide-react";
import { formatDateFr, formatTimeFr } from "~/lib/utils";
import { cn } from "~/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

// Mirrors bookings_pool_for_drivers view — no medical fields. patient_full_name
// is only ever populated for "my rides" (accepted/in_progress/completed, see
// fetchDriverRides) — the pool view only exposes the first name pre-acceptance.
export interface PoolRide {
  id: string;
  driver_id: string | null;
  patient_first_name: string;
  patient_full_name?: string;
  patient_phone: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number | null;
  pickup_datetime: string;
  return_datetime: string | null;
  vehicle_type: "taxi" | "vsl" | "pmr";
  trip_type: "aller_simple" | "aller_retour" | "multiple";
  requires_wheelchair: boolean;
  requires_stretcher: boolean;
  requires_oxygen: boolean;
  passenger_count: number;
  estimated_price: number | null;
  status: string;
  created_at: string;
  distance_to_driver_km?: number | null;
}

interface RideCardProps {
  ride: PoolRide;
  onAccept: (rideId: string) => void;
  isAccepting: boolean;
  onStart?: (rideId: string) => void;
  isStarting?: boolean;
  onComplete?: (rideId: string) => void;
  isCompleting?: boolean;
  onCancel?: (rideId: string) => void;
  isCancelling?: boolean;
}

const vehicleIcons: Record<string, string> = {
  taxi: "🚕",
  vsl: "🚐",
  pmr: "♿",
};

const statusLabels: Record<string, string> = {
  accepted: "Acceptée",
  in_progress: "En cours",
  completed: "Terminée",
};

function buildNavigationLinks(address: string, lat: number | null, lng: number | null) {
  const hasCoords = lat != null && lng != null;
  const destination = hasCoords ? `${lat},${lng}` : address;
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
    waze: hasCoords
      ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`,
    appleMaps: `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`,
  };
}

function NavigationMenu({
  address,
  lat,
  lng,
  label,
}: {
  address: string;
  lat: number | null;
  lng: number | null;
  label: string;
}) {
  const links = buildNavigationLinks(address, lat, lng);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1.5">
        <a
          href={links.googleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Google Maps
        </a>
        <a
          href={links.waze}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Waze
        </a>
        <a
          href={links.appleMaps}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Apple Plans
        </a>
      </PopoverContent>
    </Popover>
  );
}

export function RideCard({
  ride,
  onAccept,
  isAccepting,
  onStart,
  isStarting,
  onComplete,
  isCompleting,
  onCancel,
  isCancelling,
}: RideCardProps) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const pickupDate = formatDateFr(ride.pickup_datetime);
  const pickupTime = formatTimeFr(ride.pickup_datetime);
  const isToday = new Date(ride.pickup_datetime).toDateString() === new Date().toDateString();
  const isTomorrow =
    new Date(ride.pickup_datetime).toDateString() ===
    new Date(Date.now() + 86400000).toDateString();

  const dayLabel = isToday ? "Aujourd'hui" : isTomorrow ? "Demain" : pickupDate;

  const needs = [
    ride.requires_wheelchair && "Fauteuil roulant",
    ride.requires_stretcher && "Brancard",
    ride.requires_oxygen && "Oxygène",
  ].filter(Boolean);

  return (
    <article
      className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md hover:ring-brand-blue-200 transition-all overflow-hidden"
      aria-label={`Course disponible — ${ride.pickup_address} vers ${ride.dropoff_address}`}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between bg-gray-50 border-b px-4 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <Clock className="h-4 w-4 text-brand-blue-500" aria-hidden="true" />
          <time dateTime={ride.pickup_datetime}>
            {dayLabel} à {pickupTime}
          </time>
        </span>
        <span className="flex items-center gap-2">
          {statusLabels[ride.status] && (
            <span className="rounded-full bg-brand-blue-100 text-brand-blue-700 px-2 py-0.5 text-xs font-semibold">
              {statusLabels[ride.status]}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <span aria-hidden="true">{vehicleIcons[ride.vehicle_type]}</span>
            {ride.vehicle_type.toUpperCase()}
          </span>
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Route */}
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <Navigation
              className="h-4 w-4 text-brand-blue-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              {ride.distance_to_driver_km != null ? (
                <p className="text-sm font-bold text-gray-900 leading-snug">
                  {ride.distance_to_driver_km} km{" "}
                  <span className="font-normal text-gray-400">
                    jusqu'à la prise en charge
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Départ</p>
              )}
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {ride.pickup_address}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin
              className="h-4 w-4 text-red-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              {ride.distance_km != null ? (
                <p className="text-sm font-bold text-gray-900 leading-snug">
                  {ride.distance_km} km{" "}
                  <span className="font-normal text-gray-400">
                    jusqu'à la destination
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Destination</p>
              )}
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {ride.dropoff_address}
              </p>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 text-gray-600">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {ride.passenger_count} passager{ride.passenger_count > 1 ? "s" : ""}
          </span>
          {ride.trip_type === "aller_retour" && (
            <span className="rounded-full bg-brand-blue-50 text-brand-blue-700 px-2.5 py-0.5 font-semibold">
              Aller-retour
            </span>
          )}
          {needs.map((n) => (
            <span
              key={n}
              className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-0.5 font-semibold"
            >
              {n}
            </span>
          ))}
        </div>

        {ride.status !== "available" && (ride.patient_full_name || ride.patient_first_name) && (
          <div className="rounded-xl bg-brand-green-50/60 border border-brand-green-100 p-3 space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-brand-green-600" aria-hidden="true" />
              {ride.patient_full_name ?? ride.patient_first_name}
            </p>
            {ride.patient_phone && (
              <a
                href={`tel:${ride.patient_phone}`}
                className="flex items-center gap-2 text-sm font-medium text-brand-green-700 hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {ride.patient_phone}
              </a>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-2 border-t border-gray-100">
          {ride.status === "available" && (
            <button
              type="button"
              onClick={() => onAccept(ride.id)}
              disabled={isAccepting}
              aria-label={`Accepter la course — ${ride.pickup_address} vers ${ride.dropoff_address}`}
              aria-busy={isAccepting}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full sm:w-auto",
                isAccepting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-brand-green-600 hover:bg-brand-green-700 shadow-md shadow-brand-green-600/20 active:scale-95"
              )}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  En cours…
                </>
              ) : (
                <>
                  <Car className="h-4 w-4" aria-hidden="true" />
                  Accepter
                </>
              )}
            </button>
          )}

          {ride.status === "accepted" && (
            <div className="flex items-center gap-2">
              <NavigationMenu
                address={ride.pickup_address}
                lat={ride.pickup_lat}
                lng={ride.pickup_lng}
                label="Naviguer vers le point de départ"
              />
              <button
                type="button"
                onClick={() => onStart?.(ride.id)}
                disabled={isStarting}
                aria-busy={isStarting}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 sm:flex-initial",
                  isStarting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-brand-blue-600 hover:bg-brand-blue-700 shadow-md shadow-brand-blue-600/20 active:scale-95"
                )}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                )}
                Démarrer la course
              </button>
            </div>
          )}

          {ride.status === "accepted" && onCancel && (
            <div className="w-full">
              {confirmingCancel ? (
                <div className="flex items-center gap-3 text-sm pt-2">
                  <span className="text-gray-700">Annuler cette course ?</span>
                  <button
                    type="button"
                    onClick={() => onCancel(ride.id)}
                    disabled={isCancelling}
                    className="font-bold text-red-600 hover:underline disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isCancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Oui, annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={isCancelling}
                    className="text-gray-500 hover:underline"
                  >
                    Non
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline pt-2"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Me désister de cette course
                </button>
              )}
            </div>
          )}

          {ride.status === "in_progress" && (
            <div className="flex items-center gap-2">
              <NavigationMenu
                address={ride.dropoff_address}
                lat={ride.dropoff_lat}
                lng={ride.dropoff_lng}
                label="Naviguer vers la destination"
              />
              <button
                type="button"
                onClick={() => onComplete?.(ride.id)}
                disabled={isCompleting}
                aria-busy={isCompleting}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 sm:flex-initial",
                  isCompleting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-brand-green-600 hover:bg-brand-green-700 shadow-md shadow-brand-green-600/20 active:scale-95"
                )}
              >
                {isCompleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FlagTriangleRight className="h-4 w-4" aria-hidden="true" />
                )}
                Terminer la course
              </button>
            </div>
          )}

          {ride.status === "completed" && (
            <span className="rounded-full bg-gray-100 text-gray-600 px-3 py-1.5 text-xs font-semibold">
              {statusLabels.completed}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
