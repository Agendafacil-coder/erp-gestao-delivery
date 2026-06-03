import { useEffect, useMemo, useState } from "react";
import type { LocalOrder, LocalDriver, LocalAlert } from "@/lib/db/localDb";
import { localDb } from "@/lib/db/localDb";
import { orderRepository, USE_POSTGRES } from "@/lib/repositories";
import type { OrderLineItemDto } from "@/lib/repositories/types";
import {
  computeDashboardSnapshot,
  type DashboardSnapshot,
} from "@/lib/ops/dashboardMetrics";

type LineItemWithOrder = OrderLineItemDto & { order_id: string };

export function useDashboardData(input: {
  tenantId: string | undefined;
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
}): DashboardSnapshot & { lineItemsLoading: boolean } {
  const [lineItems, setLineItems] = useState<LineItemWithOrder[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);

  const orderIdsKey = useMemo(
    () => input.orders.map((o) => o.id).join(","),
    [input.orders],
  );

  useEffect(() => {
    if (!input.tenantId || input.orders.length === 0) {
      setLineItems([]);
      return;
    }

    let cancelled = false;

    async function loadLineItems() {
      setLineItemsLoading(true);
      try {
        if (!USE_POSTGRES) {
          const all = localDb.get<{ order_id: string; name: string; quantity: number; unit_price: number; notes: string | null }>(
            "order_line_items",
          );
          const idSet = new Set(input.orders.map((o) => o.id));
          const scoped = all
            .filter((row) => idSet.has(row.order_id))
            .map((row) => ({
              order_id: row.order_id,
              name: row.name,
              quantity: row.quantity,
              unit_price: row.unit_price,
              notes: row.notes,
            }));
          if (!cancelled) setLineItems(scoped);
          return;
        }

        const ids = input.orders.slice(0, 40).map((o) => o.id);
        const batches = await Promise.all(
          ids.map((orderId) =>
            orderRepository.listOrderLineItems(orderId, input.tenantId!),
          ),
        );
        const merged: LineItemWithOrder[] = [];
        batches.forEach((items, idx) => {
          const orderId = ids[idx];
          for (const item of items) {
            merged.push({ ...item, order_id: orderId });
          }
        });
        if (!cancelled) setLineItems(merged);
      } catch {
        if (!cancelled) setLineItems([]);
      } finally {
        if (!cancelled) setLineItemsLoading(false);
      }
    }

    loadLineItems();
    return () => {
      cancelled = true;
    };
  }, [input.tenantId, orderIdsKey, input.orders]);

  const snapshot = useMemo(
    () =>
      computeDashboardSnapshot({
        orders: input.orders,
        drivers: input.drivers,
        alerts: input.alerts,
        lineItems,
      }),
    [input.orders, input.drivers, input.alerts, lineItems],
  );

  return { ...snapshot, lineItemsLoading };
}
