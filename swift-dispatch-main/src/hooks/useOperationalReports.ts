import { useEffect, useMemo, useState } from "react";
import type { LocalOrder, LocalDriver } from "@/lib/db/localDb";
import { localDb } from "@/lib/db/localDb";
import { orderRepository, USE_POSTGRES } from "@/lib/repositories";
import type { OrderLineItemDto } from "@/lib/repositories/types";
import { listMenuAdminFn } from "@/functions/menu";
import { listOrderEventsFn } from "@/functions/orders";
import {
  computeOperationalReports,
  rangeFromPreset,
  type OperationalDateRange,
  type OperationalReportsSnapshot,
  type ReportDatePreset,
} from "@/lib/ops/operationalReports";

type LineItemWithOrder = OrderLineItemDto & { order_id: string };

export function useOperationalReports(input: {
  tenantId: string | undefined;
  orders: LocalOrder[];
  drivers: LocalDriver[];
  preset: ReportDatePreset;
  customRange: OperationalDateRange;
}): { report: OperationalReportsSnapshot; loading: boolean } {
  const [lineItems, setLineItems] = useState<LineItemWithOrder[]>([]);
  const [productToCategory, setProductToCategory] = useState<Map<string, string>>(new Map());
  const [cancelNotesByOrderId, setCancelNotesByOrderId] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const range = useMemo(
    () => rangeFromPreset(input.preset, input.customRange),
    [input.preset, input.customRange.from, input.customRange.to],
  );

  const orderIdsKey = useMemo(
    () => input.orders.map((o) => o.id).join(","),
    [input.orders],
  );

  useEffect(() => {
    if (!input.tenantId) {
      setLineItems([]);
      setProductToCategory(new Map());
      setCancelNotesByOrderId(new Map());
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const idSet = new Set(input.orders.map((o) => o.id));
        const items: LineItemWithOrder[] = [];

        if (!USE_POSTGRES) {
          const all = localDb.get<{
            order_id: string;
            name: string;
            quantity: number;
            unit_price: number;
            notes: string | null;
          }>("order_line_items");
          for (const row of all) {
            if (idSet.has(row.order_id)) {
              items.push({
                order_id: row.order_id,
                name: row.name,
                quantity: row.quantity,
                unit_price: row.unit_price,
                notes: row.notes,
              });
            }
          }
        } else {
          const ids = input.orders.slice(0, 60).map((o) => o.id);
          const batches = await Promise.all(
            ids.map((orderId) =>
              orderRepository.listOrderLineItems(orderId, input.tenantId!),
            ),
          );
          batches.forEach((batch, idx) => {
            const orderId = ids[idx];
            for (const item of batch) {
              items.push({ ...item, order_id: orderId });
            }
          });
        }

        const catMap = new Map<string, string>();
        if (USE_POSTGRES) {
          try {
            const menu = await listMenuAdminFn({ data: { tenantId: input.tenantId! } });
            for (const cat of menu.categories) {
              for (const item of cat.items) {
                catMap.set(item.name.trim(), cat.name);
              }
            }
          } catch {
            /* menu opcional */
          }
          try {
            const events = await listOrderEventsFn({
              data: { tenantId: input.tenantId!, limit: 100 },
            });
            const notes = new Map<string, string>();
            for (const ev of events) {
              if (ev.toStatus === "cancelado" && ev.note?.trim()) {
                notes.set(ev.orderId, ev.note.trim());
              }
            }
            if (!cancelled) setCancelNotesByOrderId(notes);
          } catch {
            if (!cancelled) setCancelNotesByOrderId(new Map());
          }
        } else {
          const events = localDb.get<{
            order_id: string;
            to_status: string;
            note?: string | null;
          }>("order_events");
          const notes = new Map<string, string>();
          for (const ev of events) {
            if (ev.to_status === "cancelado" && ev.note?.trim()) {
              notes.set(ev.order_id, ev.note.trim());
            }
          }
          if (!cancelled) setCancelNotesByOrderId(notes);
        }

        if (!cancelled) {
          setLineItems(items);
          setProductToCategory(catMap);
        }
      } catch {
        if (!cancelled) {
          setLineItems([]);
          setProductToCategory(new Map());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [input.tenantId, orderIdsKey, input.orders]);

  const report = useMemo(
    () =>
      computeOperationalReports({
        orders: input.orders,
        drivers: input.drivers,
        lineItems,
        productToCategory,
        cancelNotesByOrderId,
        range,
      }),
    [input.orders, input.drivers, lineItems, productToCategory, cancelNotesByOrderId, range],
  );

  return { report, loading };
}
