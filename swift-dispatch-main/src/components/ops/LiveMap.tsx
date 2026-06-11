import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { OpsMapbox, type MapMarker } from "@/components/map/OpsMapbox";
import { SP_CENTER, getMapboxToken } from "@/lib/map/constants";
import { buildOrderHeatmapPoints } from "@/lib/map/orderHeatmap";
import type { LocalOrder } from "@/lib/db/localDb";
import { cn } from "@/lib/utils";

type LiveMapProps = {
  tick: number;
  drivers?: Array<{
    id: string;
    name: string;
    status: string;
    lat: number | null;
    lng: number | null;
    active_orders?: number;
  }>;
  orders?: Array<{
    id: string;
    code: string;
    status: string;
    priority: LocalOrder["priority"];
    lat: number | null;
    lng: number | null;
    driver_id: string | null;
  }>;
};

export function LiveMap({ drivers = [], orders = [] }: LiveMapProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  const activeOrders = useMemo(
    () =>
      orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado") as Array<
        Pick<LocalOrder, "id" | "status" | "priority" | "lat" | "lng">
      >,
    [orders],
  );

  const heatmapPoints = useMemo(
    () => buildOrderHeatmapPoints(activeOrders as LocalOrder[]),
    [activeOrders],
  );

  const markers = useMemo((): MapMarker[] => {
    const list: MapMarker[] = [];

    activeOrders.forEach((o) => {
      if (o.lat == null || o.lng == null) return;
      list.push({
        id: `order-${o.id}`,
        lng: o.lng,
        lat: o.lat,
        label: orders.find((x) => x.id === o.id)?.code ?? "",
        kind: "order",
        color: o.priority === "critica" ? "#ef4444" : "#6366f1",
      });
    });

    drivers
      .filter((d) => d.status !== "offline" && d.lat != null && d.lng != null)
      .forEach((d) => {
        list.push({
          id: `driver-${d.id}`,
          lng: d.lng!,
          lat: d.lat!,
          label: d.name,
          kind: "driver",
          color: d.status === "em_rota" ? "#22c55e" : "#a855f7",
        });
      });

    return list;
  }, [drivers, orders, activeOrders]);

  const orderCount = markers.filter((m) => m.kind === "order").length;
  const driverCount = markers.filter((m) => m.kind === "driver").length;
  const ordersMissingCoords = activeOrders.filter((o) => o.lat == null || o.lng == null).length;
  const hasToken = Boolean(getMapboxToken());

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => setShowHeatmap((v) => !v)}
          disabled={heatmapPoints.length === 0}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm",
            showHeatmap
              ? "bg-warning/15 text-warning border-warning/30"
              : "bg-card/95 text-muted-foreground border-border hover:text-foreground",
            heatmapPoints.length === 0 && "opacity-50 cursor-not-allowed",
          )}
        >
          <Flame className="size-3.5" />
          Heatmap
        </button>
      </div>

      <OpsMapbox
        className="h-[420px] lg:h-[520px] w-full rounded-lg overflow-hidden border border-border bg-muted/30"
        markers={markers}
        center={markers.length ? undefined : SP_CENTER}
        zoom={12}
        heatmapPoints={heatmapPoints}
        showHeatmap={showHeatmap}
      />
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none z-10">
        <span className="rounded-md px-2.5 py-1 text-xs border border-border bg-card shadow-sm">
          {orderCount} pedidos no mapa
        </span>
        <span className="rounded-md px-2.5 py-1 text-xs border border-border bg-card shadow-sm">
          {driverCount} entregadores
        </span>
        {showHeatmap && heatmapPoints.length > 0 && (
          <span className="rounded-md px-2.5 py-1 text-xs border border-warning/40 text-warning bg-card shadow-sm">
            Heatmap · {heatmapPoints.length} pontos
          </span>
        )}
        {hasToken && ordersMissingCoords > 0 && (
          <span className="rounded-md px-2.5 py-1 text-xs border border-warning/40 text-warning bg-card shadow-sm">
            {ordersMissingCoords} pedido(s) sem coordenadas
          </span>
        )}
      </div>
    </div>
  );
}
