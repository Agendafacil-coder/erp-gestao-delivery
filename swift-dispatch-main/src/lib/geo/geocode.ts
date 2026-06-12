import { buildNavigationAddress } from "@/lib/geo/addressNavigation";

function getMapboxToken(): string | null {
  const token = process.env.VITE_MAPBOX_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN;
  return typeof token === "string" && token.length > 10 ? token : null;
}

async function geocodeAddressNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "DeliveryOS/1.0 (delivery-erp)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = data[0];
    if (!hit?.lat || !hit.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function geocodeAddress(
  query: string,
  proximity?: { lat: number; lng: number } | null,
): Promise<{ lat: number; lng: number } | null> {
  const token = getMapboxToken();
  const q = query.trim();
  if (!q) return null;

  if (token) {
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
      if (res.ok) {
        const data = (await res.json()) as {
          features?: Array<{ center?: [number, number] }>;
        };
        const center = data.features?.[0]?.center;
        if (center && center.length >= 2) {
          const [lng, lat] = center;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return { lat, lng };
          }
        }
      }
    } catch {
      /* tenta fallback */
    }
  }

  return geocodeAddressNominatim(q);
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
