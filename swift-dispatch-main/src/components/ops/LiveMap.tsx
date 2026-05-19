import { useMemo } from "react";
import { OpsMapbox, type MapMarker } from "@/components/map/OpsMapbox";
import { SP_CENTER } from "@/lib/map/constants";

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
    priority: string;
    lat: number | null;
    lng: number | null;
    driver_id: string | null;
  }>;
};

export function LiveMap({ drivers = [], orders = [] }: LiveMapProps) {
  const markers = useMemo((): MapMarker[] => {
    const list: MapMarker[] = [];

    orders
      .filter((o) => o.status !== "entregue" && o.status !== "cancelado")
      .forEach((o) => {
        if (o.lat == null || o.lng == null) return;
        list.push({
          id: `order-${o.id}`,
          lng: o.lng,
          lat: o.lat,
          label: o.code,
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
  }, [drivers, orders]);

  return (
    <OpsMapbox
      className="h-[420px] lg:h-[520px] w-full rounded-2xl overflow-hidden border border-border"
      markers={markers}
      center={markers.length ? undefined : SP_CENTER}
      zoom={12}
    />
  );
}
