import type { DriverOrderView } from "@/functions/driverOps";

export type RouteStop = {
  kind: "store" | "delivery";
  orderId?: string;
  code?: string;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

export type DriverStorePoint = {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function hasCoords(p: { lat: number | null; lng: number | null }): p is { lat: number; lng: number } {
  return p.lat != null && p.lng != null;
}

/** Vizinho mais próximo — ordem de entrega quando há múltiplos pedidos. */
function nearestNeighborOrder(
  start: { lat: number; lng: number },
  deliveries: RouteStop[],
): RouteStop[] {
  const remaining = [...deliveries];
  const ordered: RouteStop[] = [];
  let cursor = start;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const stop = remaining[i];
      const dist = hasCoords(stop)
        ? haversineKm(cursor, stop)
        : Number.POSITIVE_INFINITY - remaining.length + i;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    if (hasCoords(next)) cursor = next;
  }

  return ordered;
}

/** Monta paradas: loja (se ainda não retirou) + entregas na ordem otimizada. */
export function buildDriverRouteStops(
  orders: DriverOrderView[],
  store: DriverStorePoint | null,
  driverPosition?: { lat: number; lng: number } | null,
): RouteStop[] {
  if (orders.length === 0) return [];

  const needsStore = orders.some((o) => !o.picked_up_at);
  const stops: RouteStop[] = [];

  if (needsStore && store) {
    stops.push({
      kind: "store",
      label: store.name,
      address: store.address,
      lat: store.lat,
      lng: store.lng,
    });
  }

  const deliveryStops: RouteStop[] = orders.map((o) => ({
    kind: "delivery" as const,
    orderId: o.id,
    code: o.code,
    label: o.customer_name,
    address: o.address,
    lat: o.lat,
    lng: o.lng,
  }));

  const start =
    (needsStore && store && hasCoords(store) ? store : null) ??
    (driverPosition ?? null) ??
    (deliveryStops.find(hasCoords) ?? null);

  const orderedDeliveries =
    deliveryStops.length > 1 && start
      ? nearestNeighborOrder(start, deliveryStops)
      : deliveryStops;

  return [...stops, ...orderedDeliveries];
}
