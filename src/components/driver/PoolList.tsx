import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, LayoutGrid, Rows3, ArrowDownWideNarrow, MapPin, Map as MapIcon } from "lucide-react";
import type { RideMapMarker } from "./RideMap";

// mapbox-gl à lui seul pèse ~1 Mo minifié — la carte est repliée par défaut
// (showMap), donc un import statique gonflerait le bundle du dashboard
// chauffeur pour tout le monde, même ceux qui ne l'ouvrent jamais.
const RideMap = lazy(() => import("./RideMap").then((m) => ({ default: m.RideMap })));
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { RideCard, type PoolRide } from "./RideCard";
import { PoolRideRow } from "./PoolRideRow";

type VehicleFilter = "all" | "taxi" | "vsl" | "pmr";
type SortBy = "urgency" | "proximity";
type ViewMode = "compact" | "grid";

export interface DriverProfileFilter {
  vehicle_type: "taxi" | "vsl" | "ambulance";
  pmr_equipped: boolean;
  stretcher_equipped: boolean;
  oxygen_equipped: boolean;
}

interface PoolListProps {
  rides: PoolRide[];
  onAccept: (rideId: string) => void;
  acceptingId: string | null;
  isAccepting: boolean;
  driverProfile?: DriverProfileFilter | null;
  onAcceptSeries?: (rideIds: string[]) => void;
  acceptingSeriesId?: string | null;
  onRefuse?: (rideId: string) => void;
  refusingId?: string | null;
  isRefusing?: boolean;
  // Rayon d'acceptation : contrairement aux filtres ci-dessous (purement
  // côté client, sur les courses déjà chargées), c'est un réglage serveur
  // qui détermine quelles courses arrivent jusque dans `rides` — et
  // déclenchent une notification. Regroupé ici avec les autres filtres du
  // pool plutôt que sur une page séparée, pour qu'un chauffeur qui se
  // demande "pourquoi je ne vois pas telle course" trouve les deux causes
  // possibles au même endroit.
  acceptanceRadiusKm?: number | null;
  onSetAcceptanceRadius?: (km: number | null) => void;
  isSettingAcceptanceRadius?: boolean;
  driverLat?: number | null;
  driverLng?: number | null;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, null] as const;

const VIRTUALIZE_THRESHOLD = 20;
const ROW_HEIGHT_ESTIMATE = 96;

function matchesSearch(ride: PoolRide, query: string): boolean {
  if (!query) return true;
  const haystack = `${ride.pickup_address} ${ride.dropoff_address}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function defaultVehicleFilter(profile: DriverProfileFilter | null | undefined): VehicleFilter {
  if (!profile) return "all";
  if (profile.vehicle_type === "taxi") return "taxi";
  if (profile.vehicle_type === "vsl" || profile.vehicle_type === "ambulance") return "vsl";
  return "all";
}

export function PoolList({
  rides,
  onAccept,
  acceptingId,
  isAccepting,
  driverProfile,
  onAcceptSeries,
  acceptingSeriesId,
  onRefuse,
  refusingId,
  isRefusing,
  acceptanceRadiusKm,
  onSetAcceptanceRadius,
  isSettingAcceptanceRadius,
  driverLat,
  driverLng,
}: PoolListProps) {
  const [showMap, setShowMap] = useState(() => {
    try { return localStorage.getItem("driver-pool-map") === "1"; } catch { return false; }
  });
  const toggleMap = () => {
    setShowMap((v) => {
      const next = !v;
      try { localStorage.setItem("driver-pool-map", next ? "1" : "0"); } catch {}
      return next;
    });
  };
  const [search, setSearch] = useState("");

  // Toutes les rides du pool groupées par series_id (non filtrées) pour
  // que chaque carte/ligne voie l'ensemble des séances disponibles de sa série
  const seriesPoolMap = useMemo(() => {
    const map: Record<string, PoolRide[]> = {};
    rides.forEach((r) => {
      if (r.series_id) {
        if (!map[r.series_id]) map[r.series_id] = [];
        map[r.series_id].push(r);
      }
    });
    return map;
  }, [rides]);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>(() => defaultVehicleFilter(driverProfile));
  const [accessibilityOnly, setAccessibilityOnly] = useState(false);
  // Tri et vue sont des préférences durables (le chauffeur les re-choisit
  // sinon à chaque session) — persistées en localStorage. La recherche
  // texte et "besoins spécifiques" restent volontairement remises à zéro à
  // chaque visite : un filtre oublié actif d'une session précédente
  // masquerait silencieusement des courses disponibles.
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    try {
      const stored = localStorage.getItem("driver-pool-sort");
      return stored === "urgency" || stored === "proximity" ? stored : "urgency";
    } catch {
      return "urgency";
    }
  });
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem("driver-pool-view");
      if (stored === "compact" || stored === "grid") return stored;
    } catch {
      // ignore
    }
    return rides.length > VIRTUALIZE_THRESHOLD ? "compact" : "grid";
  });

  const updateSortBy = (value: SortBy) => {
    setSortBy(value);
    try { localStorage.setItem("driver-pool-sort", value); } catch {}
  };
  const updateViewMode = (value: ViewMode) => {
    setViewMode(value);
    try { localStorage.setItem("driver-pool-view", value); } catch {}
  };

  const hasAppliedDriverDefault = useRef(false);
  useEffect(() => {
    if (hasAppliedDriverDefault.current || !driverProfile) return;
    hasAppliedDriverDefault.current = true;
    setVehicleFilter(defaultVehicleFilter(driverProfile));
  }, [driverProfile]);

  const filteredRides = useMemo(() => {
    let result = rides.filter((ride) => {
      if (vehicleFilter !== "all" && ride.vehicle_type !== vehicleFilter) return false;
      if (accessibilityOnly && !ride.requires_wheelchair && !ride.requires_stretcher && !ride.requires_oxygen) {
        return false;
      }
      if (driverProfile) {
        if (ride.requires_wheelchair && !driverProfile.pmr_equipped) return false;
        if (ride.requires_stretcher && !driverProfile.stretcher_equipped) return false;
        if (ride.requires_oxygen && !driverProfile.oxygen_equipped) return false;
      }
      if (!matchesSearch(ride, search)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "proximity") {
        const da = a.distance_to_driver_km ?? Infinity;
        const db = b.distance_to_driver_km ?? Infinity;
        if (da !== db) return da - db;
      }
      return new Date(a.pickup_datetime).getTime() - new Date(b.pickup_datetime).getTime();
    });

    return result;
  }, [rides, vehicleFilter, accessibilityOnly, search, sortBy, driverProfile]);

  // Un pickup non accepté n'a jamais de coordonnées exposées (bookings_pool_
  // for_drivers masque pickup_lat/lng — migration 029/031) : la carte ne
  // positionne donc que la destination de chaque course, jamais son point de
  // départ, pour ne rien révéler de plus que ce que le texte affiche déjà.
  const mapMarkers = useMemo<RideMapMarker[]>(() => {
    const markers: RideMapMarker[] = [];
    if (driverLat != null && driverLng != null) {
      markers.push({ id: "driver", lat: driverLat, lng: driverLng, kind: "driver", label: "Vous" });
    }
    for (const ride of filteredRides) {
      if (ride.dropoff_lat == null || ride.dropoff_lng == null) continue;
      const minutesUntil = (new Date(ride.pickup_datetime).getTime() - Date.now()) / 60000;
      markers.push({
        id: ride.id,
        lat: ride.dropoff_lat,
        lng: ride.dropoff_lng,
        kind: "dropoff",
        urgent: minutesUntil >= 0 && minutesUntil <= 20,
        label: `${new Date(ride.pickup_datetime).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} → ${ride.dropoff_address}`,
      });
    }
    return markers;
  }, [filteredRides, driverLat, driverLng]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filteredRides.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE,
    overscan: 8,
  });

  const hasActiveFilters = vehicleFilter !== "all" || accessibilityOnly || search.trim() !== "";

  return (
    <div className="space-y-4">
      {/* Barre de filtres / tri */}
      <div className="sticky top-16 z-30 rounded-2xl bg-white/95 p-3 shadow-sm ring-1 ring-gray-100 backdrop-blur-sm">
        {/* Ligne 1 : recherche + toggle vue */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1 min-w-0">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une adresse…"
              aria-label="Rechercher une course par adresse"
              className="pl-9"
            />
          </div>

          <div className="shrink-0 flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => updateViewMode("compact")}
              aria-pressed={viewMode === "compact"}
              aria-label="Vue liste compacte"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                viewMode === "compact" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Rows3 className="h-3.5 w-3.5" aria-hidden="true" />
              Liste
            </button>
            <button
              type="button"
              onClick={() => updateViewMode("grid")}
              aria-pressed={viewMode === "grid"}
              aria-label="Vue détaillée en cartes"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                viewMode === "grid" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Cartes
            </button>
          </div>

          <button
            type="button"
            onClick={toggleMap}
            aria-pressed={showMap}
            aria-label={showMap ? "Masquer la carte" : "Afficher la carte"}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
              showMap ? "bg-brand-blue-50 text-brand-blue-700 ring-1 ring-brand-blue-200" : "bg-gray-100 text-gray-500 hover:text-gray-700"
            )}
          >
            <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Carte
          </button>
        </div>

        {showMap && (
          <div className="mb-2">
            <Suspense fallback={<div className="h-[220px] w-full rounded-2xl bg-gray-100 animate-pulse" />}>
              <RideMap markers={mapMarkers} height="220px" />
            </Suspense>
            <p className="mt-1.5 text-[11px] text-gray-400">
              Seule la destination de chaque course est positionnée — le point de prise en charge reste masqué tant
              que la course n'est pas acceptée.
            </p>
          </div>
        )}

        {/* Ligne 2 : filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v as VehicleFilter)}>
            <SelectTrigger className="w-auto" aria-label="Filtrer par type de véhicule">
              <SelectValue placeholder="Véhicule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous véhicules</SelectItem>
              <SelectItem value="taxi">🚕 Taxi</SelectItem>
              <SelectItem value="vsl">🚐 VSL</SelectItem>
              <SelectItem value="pmr">♿ PMR</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => updateSortBy(v as SortBy)}>
            <SelectTrigger className="w-auto" aria-label="Trier les courses">
              <ArrowDownWideNarrow className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <SelectValue placeholder="Trier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgency">Plus urgent d'abord</SelectItem>
              <SelectItem value="proximity">Plus proche d'abord</SelectItem>
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Checkbox
              checked={accessibilityOnly}
              onCheckedChange={(checked) => setAccessibilityOnly(checked === true)}
              aria-label="Afficher uniquement les courses avec besoins spécifiques"
            />
            Besoins spécifiques
          </label>

          {onSetAcceptanceRadius && (
            <Select
              value={String(acceptanceRadiusKm ?? "null")}
              onValueChange={(v) => onSetAcceptanceRadius(v === "null" ? null : Number(v))}
            >
              <SelectTrigger className="w-auto" aria-label="Rayon d'acceptation autour de votre stationnement">
                <MapPin className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((km) => (
                  <SelectItem key={String(km)} value={String(km ?? "null")}>
                    {km === null ? "Rayon illimité" : `Rayon ${km} km`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isSettingAcceptanceRadius && <span className="text-xs text-gray-400">Enregistrement…</span>}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          {filteredRides.length} course{filteredRides.length > 1 ? "s" : ""}
          {hasActiveFilters && rides.length !== filteredRides.length
            ? ` sur ${rides.length} affichée${filteredRides.length > 1 ? "s" : ""}`
            : ""}
          {onSetAcceptanceRadius && (
            <>
              {" · "}
              Seul le rayon change les courses qui vous sont proposées (et notifiées) — les autres filtres ci-dessus
              n'affectent que cet affichage.
            </>
          )}
        </p>
      </div>

      {filteredRides.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 p-12 text-center">
          <p className="text-lg font-semibold text-gray-700">Aucune course ne correspond</p>
          <p className="text-sm text-muted-foreground mt-1">
            Essayez d'élargir vos filtres ou votre recherche.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <ul
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 list-none"
          aria-label="Liste des courses disponibles"
        >
          {filteredRides.map((ride) => (
            <li key={ride.id} className="min-w-0">
              <RideCard
                ride={ride}
                onAccept={onAccept}
                isAccepting={acceptingId === ride.id && isAccepting}
                onAcceptSeries={onAcceptSeries}
                isAcceptingSeries={acceptingSeriesId === ride.id}
                seriesPoolRides={ride.series_id ? seriesPoolMap[ride.series_id] : undefined}
                onRefuse={onRefuse}
                isRefusing={refusingId === ride.id && !!isRefusing}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div
          ref={parentRef}
          className="max-h-[70vh] overflow-y-auto rounded-2xl"
          aria-label="Liste des courses disponibles"
        >
          <ul
            className="relative list-none"
            style={{ height: virtualizer.getTotalSize() }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const ride = filteredRides[virtualRow.index];
              if (!ride) return null;
              return (
                <li
                  key={ride.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full pb-3"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <PoolRideRow
                    ride={ride}
                    onAccept={onAccept}
                    isAccepting={acceptingId === ride.id && isAccepting}
                    onAcceptSeries={onAcceptSeries}
                    isAcceptingSeries={acceptingSeriesId === ride.id}
                    seriesPoolRides={ride.series_id ? seriesPoolMap[ride.series_id] : undefined}
                    onRefuse={onRefuse}
                    isRefusing={refusingId === ride.id && !!isRefusing}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
