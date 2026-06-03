import type { LocalOrder } from "@/lib/db/localDb";

/** Taxa fixa por entrega + 70% da taxa de entrega do pedido */
const BASE_FEE_BRL = 6;
const DELIVERY_FEE_SHARE = 0.7;

export function calcDriverPayout(order: Pick<LocalOrder, "delivery_fee">): number {
  const fee = order.delivery_fee ?? 0;
  return Math.round((BASE_FEE_BRL + fee * DELIVERY_FEE_SHARE) * 100) / 100;
}

export function sumDriverPayouts(orders: Pick<LocalOrder, "delivery_fee">[]): number {
  return Math.round(orders.reduce((s, o) => s + calcDriverPayout(o), 0) * 100) / 100;
}
