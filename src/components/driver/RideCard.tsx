import { useState, useEffect } from "react";
import { MapPin, Clock, Car, Users, Navigation, Loader2, PlayCircle, FlagTriangleRight, XCircle, User, Phone, CalendarPlus, Banknote, ChevronDown, ChevronUp, ClipboardCheck, Building2, Repeat, Lock } from "lucide-react";
import { SeriesRideSelectPanel } from "./SeriesRideSelectPanel";
import { formatDateFr, formatTimeFr, formatCountdown } from "~/lib/utils";
import { cn } from "~/lib/utils";
import { revealThresholdMin } from "~/lib/bookingMasking";

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
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { StarRating } from "~/components/ui/star-rating";
import { RatingForm } from "~/components/booking/RatingForm";

// Mirrors bookings_pool_for_drivers view — no medical fields. patient_full_name
// is only ever populated for "my rides" (accepted/in_progress/completed, see
// fetchDriverRides) — the pool view only exposes the first name pre-acceptance.
export interface PoolRide {
  id: string;
  driver_id: string | null;
  patient_first_name: string;
  patient_full_name?: string;
  // null pre-acceptance for pool rides (bookings_pool_for_drivers masks it,
  // see migration 029); populated once the ride is in "my rides".
  patient_phone: string | null;
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
  // Set when this booking belongs to a series and another driver currently
  // holds priority on it (see accept_ride()'s priority propagation in
  // migration 029). Rides reserved for another driver are filtered out of
  // the pool entirely, so when present here it always means *this* driver
  // holds the priority window.
  priority_driver_id?: string | null;
  priority_expires_at?: string | null;
  // Set once submitted, only exposed on "my rides" (bookings_active_for_driver).
  driver_rating_given?: number | null;
  patient_rating_received?: number | null;
  // Patient's average rating from drivers, toutes courses confondues — exposed
  // both in the pool (avant acceptation, façon note du passager chez Uber) et
  // sur "my rides" pour cohérence (migration 034).
  patient_rating_avg?: number | null;
  // Non identifiants — exposés dans le pool (migration 035) pour aider à la
  // décision d'acceptation sans révéler l'identité/le contact du patient.
  pmt_declared?: boolean | null;
  is_hospitalization?: boolean | null;
  series_id?: string | null;
  series_index?: number | null;
  series_total?: number | null;
}

interface RideCardProps {
  ride: PoolRide;
  onAccept: (rideId: string) => void;
  isAccepting: boolean;
  onAcceptSeries?: (rideIds: string[]) => void;
  isAcceptingSeries?: boolean;
  seriesPoolRides?: PoolRide[];
  onRefuse?: (rideId: string) => void;
  isRefusing?: boolean;
  onStart?: (rideId: string) => void;
  isStarting?: boolean;
  onComplete?: (rideId: string) => void;
  isCompleting?: boolean;
  onCancel?: (rideId: string) => void;
  isCancelling?: boolean;
  onCancelSeries?: (rideIds: string[]) => void;
  isCancellingSeries?: boolean;
  onRate?: (rideId: string, rating: number, comment?: string) => void;
  isRating?: boolean;
  seriesRides?: PoolRide[];
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

function getDefaultNavUrl(address: string, lat: number | null, lng: number | null): string {
  const links = buildNavigationLinks(address, lat, lng);
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/iPad|iPhone|iPod/.test(ua)) return links.appleMaps;
  return links.googleMaps;
}

function NavigationOptions({
  address,
  lat,
  lng,
}: {
  address: string;
  lat: number | null;
  lng: number | null;
}) {
  const links = buildNavigationLinks(address, lat, lng);
  return (
    <>
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
    </>
  );
}

function NavigationButton({
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
  return (
    <div className="flex shrink-0 rounded-xl border border-gray-200 bg-white overflow-hidden">
      <a
        href={getDefaultNavUrl(address, lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Navigation className="h-4 w-4" aria-hidden="true" />
      </a>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Choisir l'application de navigation"
            className="flex items-center px-2 py-3 text-gray-400 hover:bg-gray-50 transition-colors border-l border-gray-200 text-xs"
          >
            ▾
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1.5">
          <NavigationOptions address={address} lat={lat} lng={lng} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { vehicleIcons };

export function AddressLink({
  address,
  lat,
  lng,
  className,
}: {
  address: string;
  lat: number | null;
  lng: number | null;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
            className
          )}
        >
          {address}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1.5">
        <NavigationOptions address={address} lat={lat} lng={lng} />
      </PopoverContent>
    </Popover>
  );
}

function formatICSDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildCalendarLinks(ride: PoolRide) {
  const start = new Date(ride.pickup_datetime);
  const end = ride.return_datetime
    ? new Date(ride.return_datetime)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const title = `Course — ${ride.patient_full_name ?? ride.patient_first_name}`;
  const details = [
    `Destination : ${ride.dropoff_address}`,
    ride.patient_phone ? `Téléphone patient : ${ride.patient_phone}` : null,
    `Véhicule : ${ride.vehicle_type.toUpperCase()}`,
  ]
    .filter(Boolean)
    .join("\n");

  const startICS = formatICSDate(start);
  const endICS = formatICSDate(end);

  const googleCalendar = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${startICS}/${endICS}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
    ride.pickup_address
  )}`;

  const outlookCalendar = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(
    title
  )}&startdt=${encodeURIComponent(start.toISOString())}&enddt=${encodeURIComponent(
    end.toISOString()
  )}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(ride.pickup_address)}`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mon Taxi Sante//FR",
    "BEGIN:VEVENT",
    `UID:${ride.id}@mon-taxi-sante`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${startICS}`,
    `DTEND:${endICS}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
    `LOCATION:${ride.pickup_address}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const appleCalendar = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

  return { googleCalendar, outlookCalendar, appleCalendar };
}

function CalendarOptions({ ride }: { ride: PoolRide }) {
  const links = buildCalendarLinks(ride);
  return (
    <>
      <a
        href={links.googleCalendar}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Google Agenda
      </a>
      <a
        href={links.appleCalendar}
        download={`course-${ride.id}.ics`}
        className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Apple Calendrier (.ics)
      </a>
      <a
        href={links.outlookCalendar}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Outlook
      </a>
    </>
  );
}

function CalendarButton({ ride, children }: { ride: PoolRide; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ajouter au calendrier"
          className="flex items-center gap-1.5 text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <CalendarOptions ride={ride} />
      </PopoverContent>
    </Popover>
  );
}

export function RideCard({
  ride,
  onAccept,
  isAccepting,
  onAcceptSeries,
  isAcceptingSeries,
  seriesPoolRides,
  onRefuse,
  isRefusing,
  onStart,
  isStarting,
  onComplete,
  isCompleting,
  onCancel,
  isCancelling,
  onCancelSeries,
  isCancellingSeries,
  onRate,
  isRating,
  seriesRides,
}: RideCardProps) {
  const isCompleted = ride.status === "completed";
  // Collapsed by default when completed and already rated; expand if pending rating
  const [collapsed, setCollapsed] = useState(isCompleted && ride.driver_rating_given != null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingRefuse, setConfirmingRefuse] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [seriesAcceptOpen, setSeriesAcceptOpen] = useState(false);
  const [seriesCancelOpen, setSeriesCancelOpen] = useState(false);
  const isSeries = !!ride.series_total && ride.series_total > 1;
  const selectableSeriesPoolRides = seriesPoolRides && seriesPoolRides.length > 1 ? seriesPoolRides : null;
  const cancellableSeriesRides = seriesRides?.filter((r) => r.status === "accepted") ?? [];
  const [expanded, setExpanded] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const isPool = ride.status === "available";
  const minutesUntilPickup = useMinutesUntil(ride.pickup_datetime);
  const pickupIsUrgent = minutesUntilPickup >= 0 && minutesUntilPickup <= 45;
  const pickupIsCritical = minutesUntilPickup >= 0 && minutesUntilPickup <= 20;
  // Contact info + exact pickup address: progressive reveal threshold.
  const threshold = revealThresholdMin(minutesUntilPickup);
  const isContactRevealed =
    isPool ||
    ride.status === "in_progress" ||
    ride.status === "completed" ||
    minutesUntilPickup <= threshold;
  const minutesUntilReveal = minutesUntilPickup - threshold;
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
      className={cn(
        "rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 hover:shadow-md transition-all overflow-hidden",
        isCompleted ? "ring-gray-100 hover:ring-gray-200" : "hover:ring-brand-blue-200"
      )}
      aria-label={`Course — ${ride.pickup_address} vers ${ride.dropoff_address}`}
    >
      {/* ── Header — toujours visible ──────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-4 py-2 border-b",
          isCompleted ? "bg-gray-50 cursor-pointer" : "bg-gray-50"
        )}
        onClick={isCompleted ? () => setCollapsed((v) => !v) : undefined}
        role={isCompleted ? "button" : undefined}
        aria-expanded={isCompleted ? !collapsed : undefined}
        tabIndex={isCompleted ? 0 : undefined}
        onKeyDown={isCompleted ? (e) => e.key === "Enter" && setCollapsed((v) => !v) : undefined}
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 min-w-0">
          <Clock className="h-4 w-4 text-brand-blue-500 shrink-0" aria-hidden="true" />
          {ride.status === "accepted" ? (
            <CalendarButton ride={ride}>
              <time dateTime={ride.pickup_datetime}>
                {dayLabel} à {pickupTime}
              </time>
              <CalendarPlus className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            </CalendarButton>
          ) : (
            <time dateTime={ride.pickup_datetime}>
              {dayLabel} à {pickupTime}
            </time>
          )}
        </span>
        <span className="flex items-center gap-1 flex-wrap sm:justify-end shrink-0">
          {ride.estimated_price != null && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
                ride.status === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              )}
              title="Tarif estimé convention CPAM 2025 (distance Haversine — tarif réel légèrement supérieur)"
            >
              <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
              ~{ride.estimated_price.toFixed(2).replace(".", ",")} €
            </span>
          )}
          {isPool && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
                pickupIsCritical
                  ? "bg-red-50 text-red-700 animate-pulse"
                  : pickupIsUrgent
                  ? "bg-amber-50 text-amber-700"
                  : "bg-gray-100 text-gray-500"
              )}
              aria-label="Temps avant la prise en charge"
            >
              {minutesUntilPickup > 0
                ? `Dans ${formatCountdown(minutesUntilPickup)}`
                : "Maintenant"}
            </span>
          )}
          {statusLabels[ride.status] && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
              isCompleted ? "bg-gray-100 text-gray-500" : "bg-brand-blue-100 text-brand-blue-700"
            )}>
              {statusLabels[ride.status]}
            </span>
          )}
          {isCompleted && ride.driver_rating_given == null && (
            <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-semibold whitespace-nowrap">À noter</span>
          )}
          {isCompleted && (
            collapsed
              ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
              : <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
          )}
        </span>
      </div>

      {/* ── Résumé collapsed (courses terminées uniquement) ─────────── */}
      {isCompleted && collapsed && (
        <div className="px-4 py-2 space-y-1">
          <div className="flex items-baseline gap-1.5 text-xs">
            <Navigation className="h-3 w-3 shrink-0 text-brand-blue-400 mt-0.5" aria-hidden="true" />
            <span className="truncate font-medium text-gray-700">{ride.pickup_address}</span>
          </div>
          <div className="flex items-baseline gap-1.5 text-xs">
            <MapPin className="h-3 w-3 shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
            <span className="truncate font-medium text-gray-500">{ride.dropoff_address}</span>
          </div>
        </div>
      )}

      {/* ── Corps — caché quand collapsed ──────────────────────────── */}
      {(!isCompleted || !collapsed) && <div className="p-5 space-y-4">
        {/* Route */}
        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <Navigation
              className="h-4 w-4 text-brand-blue-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0 overflow-hidden">
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
              {isContactRevealed ? (
                <AddressLink
                  address={ride.pickup_address}
                  lat={ride.pickup_lat}
                  lng={ride.pickup_lng}
                  className="text-sm font-medium text-gray-900 leading-snug break-words"
                />
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-gray-400 italic">
                  <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  Adresse disponible dans {formatCountdown(minutesUntilReveal)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin
              className="h-4 w-4 text-red-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0 overflow-hidden">
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
              <AddressLink
                address={ride.dropoff_address}
                lat={ride.dropoff_lat}
                lng={ride.dropoff_lng}
                className="text-sm font-medium text-gray-900 leading-snug break-words"
              />
            </div>
          </div>

          {ride.trip_type === "aller_retour" && ride.return_datetime && (
            <div className="flex items-center gap-2.5 pt-1 border-t border-dashed border-brand-blue-100">
              <Repeat className="h-4 w-4 text-brand-blue-400 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Retour prévu</p>
                <p className="text-sm font-semibold text-brand-blue-700">
                  {new Date(ride.return_datetime).toDateString() !== new Date(ride.pickup_datetime).toDateString()
                    ? `${formatDateFr(ride.return_datetime)} à ${formatTimeFr(ride.return_datetime)}`
                    : formatTimeFr(ride.return_datetime)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 text-gray-600">
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
            PMT déclarée : <span className="font-semibold">{ride.pmt_declared ? "Oui" : "Non"}</span>
          </span>
          {ride.trip_type === "aller_retour" && (
            <span className="rounded-full bg-brand-blue-50 text-brand-blue-700 px-2.5 py-0.5 font-semibold">
              Aller-retour
            </span>
          )}
          {ride.status === "available" &&
            ride.priority_driver_id &&
            (!ride.priority_expires_at || new Date(ride.priority_expires_at) > new Date()) && (
              <span className="rounded-full bg-violet-50 text-violet-700 px-2.5 py-0.5 font-semibold">
                Priorité série — vous l'avez déjà acceptée
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

        {isPool && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue-700 hover:underline"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {expanded ? "Voir moins de détails" : "Voir plus de détails"}
          </button>
        )}

        {(!isPool || expanded) && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5 text-xs text-gray-700">
            <p className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
              {ride.passenger_count} passager{ride.passenger_count > 1 ? "s" : ""}
            </p>
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
        )}

        {ride.patient_first_name && (
          <div className="rounded-xl bg-brand-green-50/60 border border-brand-green-100 p-3 space-y-1.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <User className="h-4 w-4 text-brand-green-600" aria-hidden="true" />
              {isContactRevealed
                ? (ride.patient_full_name ?? ride.patient_first_name)
                : ride.patient_first_name}
              {ride.patient_rating_avg != null && (
                <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                  <StarRating value={ride.patient_rating_avg} readOnly size="sm" />
                  {ride.patient_rating_avg.toFixed(1)}
                </span>
              )}
              {ride.patient_rating_received != null && (
                <StarRating value={ride.patient_rating_received} readOnly size="sm" />
              )}
            </p>
            {isContactRevealed && !isPool ? (
              ride.patient_phone ? (
                <a
                  href={`tel:${ride.patient_phone}`}
                  className="flex items-center gap-2 text-sm font-medium text-brand-green-700 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {ride.patient_phone}
                </a>
              ) : null
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-gray-400 italic min-w-0 overflow-hidden">
                <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {isPool
                    ? "Nom complet et téléphone révélés après acceptation"
                    : `Téléphone disponible dans ${formatCountdown(minutesUntilReveal)}`}
                </span>
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-2 border-t border-gray-100">
          {ride.status === "available" && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onAccept(ride.id)}
                disabled={isAccepting || isAcceptingSeries}
                aria-label={`Accepter la course — ${ride.pickup_address} vers ${ride.dropoff_address}`}
                aria-busy={isAccepting}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 sm:flex-initial",
                  (isAccepting || isAcceptingSeries)
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
                    {isSeries ? "Cette séance" : "Accepter"}
                  </>
                )}
              </button>
              {isSeries && onAcceptSeries && selectableSeriesPoolRides && (
                <button
                  type="button"
                  onClick={() => setSeriesAcceptOpen((v) => !v)}
                  disabled={isAcceptingSeries || isAccepting}
                  aria-label={`Choisir parmi les ${selectableSeriesPoolRides.length} séances de la série`}
                  aria-busy={isAcceptingSeries}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1 sm:flex-initial",
                    (isAcceptingSeries || isAccepting)
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : seriesAcceptOpen
                      ? "bg-violet-200 text-violet-800"
                      : "bg-violet-100 text-violet-700 hover:bg-violet-200 active:scale-95"
                  )}
                >
                  {isAcceptingSeries ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Repeat className="h-4 w-4" aria-hidden="true" />
                  )}
                  {selectableSeriesPoolRides.length}/{ride.series_total} séances
                </button>
              )}
            </div>
          )}

          {ride.status === "available" && onRefuse && (
            <div className="w-full sm:w-auto">
              {confirmingRefuse ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-700">Refuser cette course ?</span>
                  <button
                    type="button"
                    onClick={() => { onRefuse(ride.id); setConfirmingRefuse(false); }}
                    disabled={isRefusing}
                    className="font-bold text-red-600 hover:underline disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isRefusing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                    Oui, refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingRefuse(false)}
                    disabled={isRefusing}
                    className="text-gray-500 hover:underline"
                  >
                    Non
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingRefuse(true)}
                  aria-label={`Refuser la course — ${ride.pickup_address} vers ${ride.dropoff_address}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 hover:underline"
                >
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Refuser
                </button>
              )}
            </div>
          )}

          {ride.status === "accepted" && (
            <div className="flex items-center gap-2">
              <NavigationButton
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
            <div className="w-full space-y-2">
              {/* Série : panneau de sélection multi-séances */}
              {isSeries && onCancelSeries && cancellableSeriesRides.length > 0 ? (
                seriesCancelOpen ? (
                  <SeriesRideSelectPanel
                    rides={cancellableSeriesRides}
                    mode="cancel"
                    isSubmitting={!!isCancellingSeries || !!isCancelling}
                    onConfirm={(ids) => { onCancelSeries(ids); setSeriesCancelOpen(false); }}
                    onClose={() => setSeriesCancelOpen(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSeriesCancelOpen(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:underline pt-2"
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Me désister de cette série
                  </button>
                )
              ) : (
                /* Course seule : confirmation classique en 2 étapes */
                confirmingCancel ? (
                  <div className="flex items-center gap-3 text-sm pt-2">
                    <span className="text-gray-700">Annuler cette course ?</span>
                    <button
                      type="button"
                      onClick={() => { onCancel(ride.id); setConfirmingCancel(false); }}
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
                )
              )}
            </div>
          )}

          {ride.status === "in_progress" && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2">
                <NavigationButton
                  address={ride.dropoff_address}
                  lat={ride.dropoff_lat}
                  lng={ride.dropoff_lng}
                  label="Naviguer vers la destination"
                />
                {confirmingComplete ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-semibold text-gray-800 flex-1">Confirmer la fin de course ?</span>
                    <button
                      type="button"
                      onClick={() => { onComplete?.(ride.id); setConfirmingComplete(false); }}
                      disabled={isCompleting}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-green-600 hover:bg-brand-green-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 transition-colors"
                    >
                      {isCompleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      Oui, terminer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingComplete(false)}
                      disabled={isCompleting}
                      className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingComplete(true)}
                    disabled={isCompleting}
                    aria-busy={isCompleting}
                    className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white bg-brand-green-600 hover:bg-brand-green-700 shadow-md shadow-brand-green-600/20 active:scale-95 transition-all flex-1 sm:flex-initial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <FlagTriangleRight className="h-4 w-4" aria-hidden="true" />
                    Terminer la course
                  </button>
                )}
              </div>
            </div>
          )}

          {ride.status === "completed" && (
            <span className="rounded-full bg-gray-100 text-gray-600 px-3 py-1.5 text-xs font-semibold">
              {statusLabels.completed}
            </span>
          )}
        </div>

        {ride.status === "completed" &&
          (ride.driver_rating_given != null ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t border-gray-100">
              <span>Votre avis sur ce patient :</span>
              <StarRating value={ride.driver_rating_given} readOnly size="sm" />
            </div>
          ) : (
            onRate && (
              <RatingForm
                prompt="Comment s'est passée cette course avec ce patient ?"
                submitLabel="Envoyer mon avis"
                isSubmitting={isRating}
                onSubmit={(rating, comment) => onRate(ride.id, rating, comment)}
              />
            )
          ))}

        {/* Panneau sélection séances à accepter */}
        {seriesAcceptOpen && selectableSeriesPoolRides && onAcceptSeries && (
          <div className="pt-2 border-t border-gray-100">
            <SeriesRideSelectPanel
              rides={selectableSeriesPoolRides}
              mode="accept"
              isSubmitting={!!isAcceptingSeries}
              onConfirm={(ids) => { onAcceptSeries(ids); setSeriesAcceptOpen(false); }}
              onClose={() => setSeriesAcceptOpen(false)}
            />
          </div>
        )}

        {/* Drawer série */}
        {seriesRides && seriesRides.length > 1 && (
          <div className="pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSeriesOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-blue-700 hover:underline"
            >
              <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
              Voir toutes les séances ({seriesRides.length})
              {seriesOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            {seriesOpen && (
              <ul className="mt-2 space-y-1">
                {seriesRides.map((s) => (
                  <li key={s.id} className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                    s.id === ride.id ? "bg-brand-blue-50 font-semibold text-brand-blue-800" : "bg-gray-50 text-gray-600"
                  )}>
                    <span className="shrink-0 w-12 font-mono">
                      {new Date(s.pickup_datetime).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="shrink-0 w-10 text-gray-400">
                      {new Date(s.pickup_datetime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className={cn(
                      "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      s.status === "completed" ? "bg-gray-100 text-gray-500"
                        : s.status === "in_progress" ? "bg-brand-blue-100 text-brand-blue-700"
                        : s.status === "accepted" ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    )}>
                      {s.status === "completed" ? "Terminée" : s.status === "in_progress" ? "En cours" : s.status === "accepted" ? "Acceptée" : "Dispo."}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>}
    </article>
  );
}
