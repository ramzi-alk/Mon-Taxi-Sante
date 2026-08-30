import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

export interface RideMapMarker {
  id: string;
  lat: number;
  lng: number;
  kind: "driver" | "pickup" | "dropoff";
  label: string;
  urgent?: boolean;
  onClick?: () => void;
}

const MARKER_COLOR: Record<RideMapMarker["kind"], string> = {
  driver: "#1244E8", // brand-blue
  pickup: "#16a34a", // brand-green — cohérent avec l'icône Navigation de RideCard
  dropoff: "#ef4444", // cohérent avec l'icône MapPin rouge de RideCard
};

function buildMarkerElement(marker: RideMapMarker): HTMLDivElement {
  const el = document.createElement("div");
  const size = marker.kind === "driver" ? 16 : 14;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.borderRadius = "50%";
  el.style.background = marker.urgent ? "#dc2626" : MARKER_COLOR[marker.kind];
  el.style.border = "2px solid white";
  el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
  el.style.cursor = marker.onClick ? "pointer" : "default";
  if (marker.urgent) el.style.animation = "mts-marker-pulse 1.5s ease-in-out infinite";
  return el;
}

interface RideMapProps {
  markers: RideMapMarker[];
  // Relie les points dans l'ordre indiqué (mode "itinéraire du jour") —
  // omis pour une simple vue d'ensemble du pool sans tracé.
  routeOrder?: string[];
  height?: string;
}

// Carte partagée entre le pool (survol des courses disponibles autour du
// chauffeur) et "Ma journée" (itinéraire des courses déjà acceptées) — même
// composant, seule la préparation des `markers`/`routeOrder` diffère selon
// l'appelant. N'affiche jamais un pickup non révélé : c'est aux appelants de
// ne passer que des coordonnées déjà légitimement visibles (voir PoolList,
// qui ne positionne le pool que sur les destinations — jamais masquées —
// plutôt que sur une adresse de prise en charge encore cachée).
export function RideMap({ markers, routeOrder, height = "260px" }: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [2.3522, 48.8566],
      zoom: 10,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !MAPBOX_TOKEN) return;

    function render() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (markers.length === 0) return;

      const bounds = new mapboxgl.LngLatBounds();
      for (const marker of markers) {
        const el = buildMarkerElement(marker);
        if (marker.onClick) el.addEventListener("click", marker.onClick);
        const mapMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([marker.lng, marker.lat])
          .setPopup(new mapboxgl.Popup({ offset: 12, closeButton: false }).setText(marker.label))
          .addTo(map!);
        markersRef.current.push(mapMarker);
        bounds.extend([marker.lng, marker.lat]);
      }

      if (map!.getLayer("mts-route")) map!.removeLayer("mts-route");
      if (map!.getSource("mts-route")) map!.removeSource("mts-route");
      if (routeOrder && routeOrder.length > 1) {
        const byId = new Map(markers.map((m) => [m.id, m]));
        const coordinates = routeOrder
          .map((id) => byId.get(id))
          .filter((m): m is RideMapMarker => !!m)
          .map((m) => [m.lng, m.lat]);
        if (coordinates.length > 1) {
          map!.addSource("mts-route", {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } },
          });
          map!.addLayer({
            id: "mts-route",
            type: "line",
            source: "mts-route",
            paint: { "line-color": "#1244E8", "line-width": 2, "line-dasharray": [2, 2] },
          });
        }
      }

      map!.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 400 });
    }

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [markers, routeOrder]);

  if (!MAPBOX_TOKEN) return null;

  return (
    <>
      <style>{`
        @keyframes mts-marker-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
          50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
        }
      `}</style>
      <div ref={containerRef} style={{ height }} className="w-full rounded-2xl overflow-hidden ring-1 ring-gray-200" />
    </>
  );
}
