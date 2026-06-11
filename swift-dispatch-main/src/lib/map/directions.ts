import { getMapboxToken } from "@/lib/map/constants";

export type LngLat = { lng: number; lat: number };

export type DrivingDirections = {
  durationMinutes: number;
  distanceKm: number;
  coordinates: LngLat[];
};

const cache = new Map<string, { at: number; data: DrivingDirections }>();
const CACHE_MS = 90_000;

function cacheKey(from: LngLat, to: LngLat) {
  return `${from.lng.toFixed(5)},${from.lat.toFixed(5)}->${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;
}

/** ETA e geometria da rota via Mapbox Directions (driving-traffic). */
export async function fetchDrivingDirections(
  from: LngLat,
  to: LngLat,
): Promise<DrivingDirections | null> {
  const token = getMapboxToken();
  if (!token) return null;

  const key = cacheKey(from, to);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("language", "pt");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as {
      routes?: Array<{
        duration?: number;
        distance?: number;
        geometry?: { coordinates?: Array<[number, number]> };
      }>;
    };

    const route = data.routes?.[0];
    const raw = route?.geometry?.coordinates;
    if (!route?.duration || !raw?.length) return null;

    const result: DrivingDirections = {
      durationMinutes: Math.max(1, Math.round(route.duration / 60)),
      distanceKm: Math.round((route.distance ?? 0) / 100) / 10,
      coordinates: raw.map(([lng, lat]) => ({ lng, lat })),
    };

    cache.set(key, { at: Date.now(), data: result });
    return result;
  } catch {
    return null;
  }
}
