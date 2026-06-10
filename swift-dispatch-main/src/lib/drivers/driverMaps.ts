type MapPoint = {
  address?: string;
  lat?: number | null;
  lng?: number | null;
};

function formatMapPoint(opts: MapPoint): string {
  if (opts.lat != null && opts.lng != null) {
    return `${opts.lat},${opts.lng}`;
  }
  return encodeURIComponent(opts.address ?? "");
}

export function buildGoogleMapsDirectionsUrl(opts: MapPoint): string {
  const dest = formatMapPoint(opts);
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

type RouteMapStop = MapPoint & { kind?: "store" | "delivery" };

/** Rota com múltiplas paradas — loja fixa no início; entregas otimizadas pelo Google. */
export function buildGoogleMapsRouteUrl(stops: RouteMapStop[]): string {
  if (stops.length === 0) return "https://www.google.com/maps";
  if (stops.length === 1) return buildGoogleMapsDirectionsUrl(stops[0]);

  const params = new URLSearchParams({ api: "1", travelmode: "driving" });
  const storeFirst = stops[0]?.kind === "store";
  const deliveries = storeFirst ? stops.slice(1) : stops;
  const deliveryPoints = deliveries.map(formatMapPoint);

  if (storeFirst && deliveries.length === 0) {
    return buildGoogleMapsDirectionsUrl(stops[0]);
  }

  if (storeFirst) {
    params.set("origin", formatMapPoint(stops[0]));
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

  if (deliveryPoints.length === 2) {
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
  if (opts.lat != null && opts.lng != null) {
    return `https://waze.com/ul?ll=${opts.lat},${opts.lng}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(opts.address ?? "")}&navigate=yes`;
}

/** Waze não suporta multi-parada — usa a próxima parada da rota. */
export function buildWazeUrlForRoute(stops: MapPoint[]): string {
  return buildWazeUrl(stops[0] ?? {});
}
