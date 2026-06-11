import { isKitchenActive, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";

/** Pedidos na cozinha há mais que este tempo são considerados "antigos" */
export const KITCHEN_STALE_HOURS = 4;

type StaleOrderInput = {
  placed_at: string;
  sla_minutes?: number;
  status: string;
};

export function getKitchenOrderAgeHours(order: StaleOrderInput, now = Date.now()): number {
  const placed = new Date(order.placed_at).getTime();
  if (!Number.isFinite(placed)) return 0;
  return Math.max(0, (now - placed) / 3_600_000);
}

/** Pedido ativo na cozinha há tempo demais (ex.: esquecido na fila). */
export function isStaleKitchenOrder(order: StaleOrderInput, now = Date.now()): boolean {
  if (!isKitchenActive(normalizeOrderStatus(order.status))) return false;
  const ageHours = getKitchenOrderAgeHours(order, now);
  const slaHours = Math.max(order.sla_minutes ?? 45, 15) / 60;
  const thresholdHours = Math.max(KITCHEN_STALE_HOURS, slaHours * 3);
  return ageHours >= thresholdHours;
}
