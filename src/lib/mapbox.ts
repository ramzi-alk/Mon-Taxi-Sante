import { logger } from "~/lib/logger";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const SEARCH_BASE_URL = "https://api.mapbox.com/search/searchbox/v1";
const DIRECTIONS_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving";

export interface MapboxSuggestion {
  mapboxId: string;
  label: string;
}

export interface MapboxPlace {
  label: string;
  lat: number;
  lng: number;
  /** Commune/ville (place_formatted Mapbox), sans le numéro/nom de rue — utilisée pour masquer l'adresse exacte tant qu'une course n'est pas acceptée. */
  municipality: string | null;
}

interface SuggestFeature {
  mapbox_id: string;
  name: string;
  place_formatted?: string;
  full_address?: string;
  feature_type: string;
}

interface RetrieveFeature {
  properties: {
    name: string;
    place_formatted?: string;
    full_address?: string;
    context?: {
      postcode?: { name?: string };
      place?: { name?: string };
      locality?: { name?: string };
    };
  };
  geometry: { coordinates: [number, number] };
}

// `place_formatted` n'est pas toujours présent dans la réponse de l'endpoint
// retrieve de Mapbox (contrairement à suggest) alors que `context` l'est
// quasi systématiquement — on reconstruit donc la commune ("75017 Paris")
// à partir de context.postcode/context.place en repli pour ne jamais
// laisser pickup_municipality/dropoff_municipality null silencieusement
// (ce qui ferait fuiter l'adresse exacte dans le pool, cf. migration 029).
function deriveMunicipality(props: RetrieveFeature["properties"]): string | null {
  if (props.place_formatted) return props.place_formatted;
  const postcode = props.context?.postcode?.name;
  const place = props.context?.place?.name ?? props.context?.locality?.name;
  const parts = [postcode, place].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Recherche adresses + POI (ex: "Hôpital Robert Debré") via Mapbox Search
 * Box API. `sessionToken` doit être le même pour un suggest() suivi de son
 * retrieve() correspondant (facturation par session Mapbox), puis renouvelé.
 */
export async function suggestAddresses(
  query: string,
  sessionToken: string,
  options?: { signal?: AbortSignal; types?: string }
): Promise<MapboxSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken,
    language: "fr",
    country: "fr",
    limit: "5",
  });
  // "category"/"brand" sont des suggestions génériques sans adresse précise
  // (ex: "Vétérinaire" affiché avec place_formatted="Category") — on ne veut
  // que des lieux réels qu'on peut géocoder (rue, adresse, établissement).
  params.set("types", options?.types ?? "street,address,poi");

  const res = await fetch(`${SEARCH_BASE_URL}/suggest?${params}`, {
    signal: options?.signal,
  });
  if (!res.ok) throw new Error(`Mapbox Search a répondu ${res.status}`);
  const data: { suggestions: SuggestFeature[] } = await res.json();

  return data.suggestions
    .filter((f) => f.feature_type !== "category" && f.feature_type !== "brand")
    .map((f) => ({
      mapboxId: f.mapbox_id,
      label: [f.name, f.place_formatted ?? f.full_address].filter(Boolean).join(", "),
    }));
}

/** Résout les coordonnées d'une suggestion Mapbox (même session_token que le suggest()). */
export async function retrieveAddress(
  mapboxId: string,
  sessionToken: string
): Promise<MapboxPlace | null> {
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken,
  });

  const res = await fetch(`${SEARCH_BASE_URL}/retrieve/${mapboxId}?${params}`);
  if (!res.ok) throw new Error(`Mapbox Search a répondu ${res.status}`);
  const data: { features: RetrieveFeature[] } = await res.json();
  const feature = data.features[0];
  if (!feature) return null;

  const [lng, lat] = feature.geometry.coordinates;
  return {
    label: [feature.properties.name, feature.properties.place_formatted ?? feature.properties.full_address]
      .filter(Boolean)
      .join(", "),
    lat,
    lng,
    municipality: deriveMunicipality(feature.properties),
  };
}

/** Résout l'adresse la plus proche de coordonnées GPS (ex: géolocalisation navigateur) via Mapbox Search Box reverse. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  sessionToken: string
): Promise<MapboxPlace | null> {
  const params = new URLSearchParams({
    longitude: String(lng),
    latitude: String(lat),
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken,
    language: "fr",
    country: "fr",
  });

  const res = await fetch(`${SEARCH_BASE_URL}/reverse?${params}`);
  if (!res.ok) throw new Error(`Mapbox Search a répondu ${res.status}`);
  const data: { features: RetrieveFeature[] } = await res.json();
  const feature = data.features[0];
  if (!feature) return null;

  const [rlng, rlat] = feature.geometry.coordinates;
  return {
    label: [feature.properties.name, feature.properties.place_formatted ?? feature.properties.full_address]
      .filter(Boolean)
      .join(", "),
    lat: rlat,
    lng: rlng,
    municipality: deriveMunicipality(feature.properties),
  };
}

/** Distance réelle sur route (km, arrondie à 2 décimales) via Mapbox Directions, ou null si indisponible. */
export async function getDrivingDistanceKm(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<number | null> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    overview: "false",
  });

  try {
    const res = await fetch(`${DIRECTIONS_BASE_URL}/${coords}?${params}`);
    if (!res.ok) throw new Error(`Mapbox Directions a répondu ${res.status}`);
    const data: { routes: { distance: number }[] } = await res.json();
    const meters = data.routes[0]?.distance;
    if (typeof meters !== "number") return null;
    return Math.round((meters / 1000) * 100) / 100;
  } catch (err) {
    logger.warn("mapbox.directions_failed", { error: (err as Error).message });
    return null;
  }
}
