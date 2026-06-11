import type { LocalOrder } from "@/lib/db/localDb";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

export type HeatmapPoint = {
  lng: number;
  lat: number;
  weight: number;
};

const PRIORITY_WEIGHT: Record<LocalOrder["priority"], number> = {
  critica: 3,
  alta: 2.2,
  normal: 1.4,
  baixa: 1,
};

/** Pontos para camada heatmap — pedidos ativos com coordenadas */
export function buildOrderHeatmapPoints(orders: LocalOrder[]): HeatmapPoint[] {
  return orders
    .filter((o) => {
      const st = normalizeOrderStatus(o.status);
      return st !== "entregue" && st !== "cancelado" && o.lat != null && o.lng != null;
    })
    .map((o) => ({
      lng: o.lng!,
      lat: o.lat!,
      weight: PRIORITY_WEIGHT[o.priority] ?? 1,
    }));
}
