import {
  buildNavigationAddress,
  hasUsableNavigationAddress,
} from "@/lib/geo/addressNavigation";

export type MapPoint = {
  address?: string;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type MapPointMode = "destination" | "origin";

/**
 * Valor bruto para Google Maps — sem encodeURIComponent (URLSearchParams faz isso).
 * Destinos: endereço textual sempre tem prioridade sobre coordenadas (evita GPS placeholder).
 */
function formatMapPoint(opts: MapPoint, mode: MapPointMode = "destination"): string {
  const navigationAddress = buildNavigationAddress({
    address: opts.address ?? "",
    neighborhood: opts.neighborhood,
  });

  if (mode === "destination" && hasUsableNavigationAddress(navigationAddress)) {
    return navigationAddress;
  }

  if (mode === "origin" && opts.lat != null && opts.lng != null) {
    return `${opts.lat},${opts.lng}`;
  }

  if (hasUsableNavigationAddress(navigationAddress)) {
    return navigationAddress;
  }

  if (opts.lat != null && opts.lng != null) {
    return `${opts.lat},${opts.lng}`;
  }

  return navigationAddress || opts.address?.trim() || "";
}

export function buildGoogleMapsDirectionsUrl(
  destination: MapPoint,
  origin?: MapPoint,
): string {
  const params = new URLSearchParams({ api: "1", travelmode: "driving" });
  params.set("destination", formatMapPoint(destination, "destination"));
  if (origin) {
    params.set("origin", formatMapPoint(origin, "origin"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

type RouteMapStop = MapPoint & { kind?: "store" | "delivery" };

/** Rota com múltiplas paradas — loja fixa no início; entregas otimizadas pelo Google. */
export function buildGoogleMapsRouteUrl(
  stops: RouteMapStop[],
  originFallback?: MapPoint,
): string {
  if (stops.length === 0) return "https://www.google.com/maps";
  if (stops.length === 1) {
    return buildGoogleMapsDirectionsUrl(stops[0], originFallback);
  }

  const params = new URLSearchParams({ api: "1", travelmode: "driving" });
  const storeFirst = stops[0]?.kind === "store";
  const deliveries = storeFirst ? stops.slice(1) : stops;
  const deliveryPoints = deliveries.map((s) => formatMapPoint(s, "destination"));

  if (storeFirst && deliveries.length === 0) {
    return buildGoogleMapsDirectionsUrl(stops[0], originFallback);
  }

  if (storeFirst) {
    params.set("origin", formatMapPoint(stops[0], "destination"));
    if (deliveryPoints.length === 1) {
      params.set("destination", deliveryPoints[0]);
    } else {
      params.set("destination", deliveryPoints[deliveryPoints.length - 1]);
      const intermediates = deliveryPoints.slice(0, -1);
      if (intermediates.length > 0) {
        params.set("waypoints", `optimize:true|${intermediates.join("|")}`);
      }
    }
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  if (originFallback) {
    params.set("origin", formatMapPoint(originFallback, "origin"));
  }

  if (deliveryPoints.length === 1) {
    params.set("destination", deliveryPoints[0]);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  if (deliveryPoints.length === 2 && !originFallback) {
    params.set("origin", deliveryPoints[0]);
    params.set("destination", deliveryPoints[1]);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  params.set("destination", deliveryPoints[deliveryPoints.length - 1]);
  const waypoints = deliveryPoints.slice(0, -1);
  params.set("waypoints", `optimize:true|${waypoints.join("|")}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildWazeUrl(opts: MapPoint): string {
  const navigationAddress = buildNavigationAddress({
    address: opts.address ?? "",
    neighborhood: opts.neighborhood,
  });

  if (hasUsableNavigationAddress(navigationAddress)) {
    return `https://waze.com/ul?q=${encodeURIComponent(navigationAddress)}&navigate=yes`;
  }

  if (opts.lat != null && opts.lng != null) {
    return `https://waze.com/ul?ll=${opts.lat},${opts.lng}&navigate=yes`;
  }

  return `https://waze.com/ul?q=${encodeURIComponent(navigationAddress)}&navigate=yes`;
}

/** Waze não suporta multi-parada — usa a próxima parada da rota. */
export function buildWazeUrlForRoute(stops: MapPoint[]): string {
  const next = stops.find(
    (s) =>
      hasUsableNavigationAddress(
        buildNavigationAddress({ address: s.address ?? "", neighborhood: s.neighborhood }),
      ) ||
      (s.lat != null && s.lng != null),
  );
  return buildWazeUrl(next ?? {});
}

export function resolveDriverNavigationOrigin(
  store: MapPoint | null | undefined,
  driverPosition?: { lat: number; lng: number } | null,
): MapPoint | undefined {
  if (driverPosition?.lat != null && driverPosition?.lng != null) {
    return { lat: driverPosition.lat, lng: driverPosition.lng };
  }
  if (store?.address?.trim() || (store?.lat != null && store?.lng != null)) {
    return store;
  }
  return undefined;
}
