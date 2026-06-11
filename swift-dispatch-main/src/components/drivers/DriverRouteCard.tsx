import type { DriverOrderView } from "@/lib/drivers/driverOps.types";
import {
  buildDriverRouteStops,
  type DriverStorePoint,
} from "@/lib/drivers/driverRouteOptimize";
import {
  buildGoogleMapsRouteUrl,
  buildWazeUrlForRoute,
  resolveDriverNavigationOrigin,
} from "@/lib/drivers/driverMaps";
import { MapPin, Navigation, Route, Store } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  orders: DriverOrderView[];
  store: DriverStorePoint | null;
  driverPosition?: { lat: number; lng: number } | null;
};

export function DriverRouteCard({ orders, store, driverPosition }: Props) {
  const stops = buildDriverRouteStops(orders, store, driverPosition);
  if (stops.length === 0) return null;

  const navigationOrigin = resolveDriverNavigationOrigin(store, driverPosition);
  const mapStops = stops.map((s) => ({
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    kind: s.kind,
  }));
  const mapsUrl = buildGoogleMapsRouteUrl(mapStops, navigationOrigin);
  const wazeUrl = buildWazeUrlForRoute(mapStops);
  const deliveryCount = stops.filter((s) => s.kind === "delivery").length;

  return (
    <section className="rounded-2xl border-2 border-primary/25 bg-primary/5 p-4 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Route className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">Sua rota</h2>
            <p className="text-xs text-muted-foreground">
              {deliveryCount === 1
                ? "1 entrega atribuída"
                : `${deliveryCount} entregas · ordem otimizada`}
            </p>
          </div>
        </div>
      </div>

      <ol className="space-y-2">
        {stops.map((stop, i) => (
          <li
            key={`${stop.kind}-${stop.orderId ?? "store"}-${i}`}
            className="flex gap-3 rounded-xl border border-border/80 bg-card/80 p-3"
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                stop.kind === "store"
                  ? "bg-warning/15 text-warning"
                  : "bg-primary/15 text-primary",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stop.kind === "store" ? (
                  <>
                    <Store className="size-3" />
                    Retirada
                  </>
                ) : (
                  <>
                    <MapPin className="size-3" />
                    Entrega {stop.code}
                  </>
                )}
              </div>
              <p className="mt-0.5 text-sm font-semibold truncate">{stop.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{stop.address}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 min-h-[3rem] rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-sm active:scale-[0.98] transition-transform"
        >
          <Navigation className="size-4" />
          Rota
        </a>
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center min-h-[3rem] px-4 rounded-xl border border-border bg-card text-xs font-semibold"
        >
          Waze
        </a>
      </div>
    </section>
  );
}
