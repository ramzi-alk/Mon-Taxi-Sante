import { MapPin, Clock, Car, Users, Navigation, Loader2 } from "lucide-react";
import { formatDateFr, formatTimeFr, formatPrice } from "~/lib/utils";
import { cn } from "~/lib/utils";

// Mirrors bookings_pool_for_drivers view — no medical fields
export interface PoolRide {
  id: string;
  driver_id: string | null;
  patient_first_name: string;
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
}

interface RideCardProps {
  ride: PoolRide;
  onAccept: (rideId: string) => void;
  isAccepting: boolean;
}

const vehicleIcons: Record<string, string> = {
  taxi: "🚕",
  vsl: "🚐",
  pmr: "♿",
};

export function RideCard({ ride, onAccept, isAccepting }: RideCardProps) {
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
        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
          <span aria-hidden="true">{vehicleIcons[ride.vehicle_type]}</span>
          {ride.vehicle_type.toUpperCase()}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Route */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <Navigation
              className="h-4 w-4 text-brand-blue-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs text-muted-foreground">Départ</p>
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {ride.pickup_address}
              </p>
            </div>
          </div>
          <div className="ml-2 border-l-2 border-dashed border-gray-200 pl-3 py-0.5">
            {ride.distance_km && (
              <span className="text-xs text-muted-foreground">
                ~{ride.distance_km} km
              </span>
            )}
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin
              className="h-4 w-4 text-red-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs text-muted-foreground">Destination</p>
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

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <p className="text-xs text-muted-foreground">Estimation</p>
            <p className="text-xl font-black text-brand-blue-700">
              {ride.estimated_price
                ? formatPrice(ride.estimated_price)
                : "Sur devis"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAccept(ride.id)}
            disabled={isAccepting}
            aria-label={`Accepter la course — ${ride.pickup_address} vers ${ride.dropoff_address}`}
            aria-busy={isAccepting}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
        </div>
      </div>
    </article>
  );
}
