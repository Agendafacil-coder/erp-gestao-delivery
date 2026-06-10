import { buildNavigationAddress } from "@/lib/geo/addressNavigation";

function getMapboxToken(): string | null {
  const token = process.env.VITE_MAPBOX_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN;
  return typeof token === "string" && token.length > 10 ? token : null;
}

export async function geocodeAddress(
  query: string,
  proximity?: { lat: number; lng: number } | null,
): Promise<{ lat: number; lng: number } | null> {
  const token = getMapboxToken();
  const q = query.trim();
  if (!token || !q) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "BR");
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "pt");
  if (proximity) {
    url.searchParams.set("proximity", `${proximity.lng},${proximity.lat}`);
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ center?: [number, number] }>;
    };
    const center = data.features?.[0]?.center;
    if (!center || center.length < 2) return null;
    const [lng, lat] = center;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function resolveOrderCoordinates(input: {
  address: string;
  neighborhood?: string | null;
  postalCode?: string | null;
  cityRegion?: string | null;
  city?: string | null;
  state?: string | null;
  storeProximity?: { lat: number; lng: number } | null;
}): Promise<{ lat: number | null; lng: number | null; navigationAddress: string }> {
  const navigationAddress = buildNavigationAddress({
    address: input.address,
    neighborhood: input.neighborhood,
    postalCode: input.postalCode,
    cityRegion: input.cityRegion,
    city: input.city,
    state: input.state,
  });
  const coords = await geocodeAddress(navigationAddress, input.storeProximity);
  return {
    navigationAddress,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  };
}
