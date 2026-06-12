import { useEffect, useRef } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { printOrderLabels, type OrderLabelPayload } from "@/lib/ops/printOrderLabels";
import type { PrintSettings } from "@/lib/ops/printSettings";
import { recordPrintHistory } from "@/lib/ops/printHistory";
import { orderRepository } from "@/lib/repositories";
import { toast } from "sonner";

type Args = {
  tenantId: string | undefined;
  storeName: string;
  orders: LocalOrder[];
  settings: PrintSettings;
};

/** Imprime comanda automaticamente quando pedidos novos entram na fila da cozinha. */
export function useKdsAutoPrint({ tenantId, storeName, orders, settings }: Args) {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const printingRef = useRef(false);

  useEffect(() => {
    if (!settings.autoPrintKds || !tenantId) return;

    const novos = orders.filter((o) => normalizeOrderStatus(o.status) === "novo");

    if (!bootstrappedRef.current) {
      novos.forEach((o) => seenIdsRef.current.add(o.id));
      bootstrappedRef.current = true;
      return;
    }

    const fresh = novos.filter((o) => !seenIdsRef.current.has(o.id));
    if (fresh.length === 0 || printingRef.current) return;

    fresh.forEach((o) => seenIdsRef.current.add(o.id));
    printingRef.current = true;

    void (async () => {
      try {
        const payloads: OrderLabelPayload[] = await Promise.all(
          fresh.map(async (order) => {
            const lines = await orderRepository.listOrderLineItems(order.id, tenantId);
            return {
              order,
              lines: lines.map((l) => ({
                name: l.name,
                quantity: l.quantity,
                notes: l.notes,
              })),
            };
          }),
        );

        printOrderLabels(payloads, storeName, {
          format: settings.format,
          copies: settings.copies,
        });

        for (const order of fresh) {
          recordPrintHistory(tenantId, {
            orderId: order.id,
            code: order.code,
            format: settings.format,
          });
        }

        toast.success(
          fresh.length === 1
            ? `Comanda ${fresh[0]?.code} enviada à impressora`
            : `${fresh.length} comandas enviadas à impressora`,
          { duration: 2500 },
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha na impressão automática");
      } finally {
        printingRef.current = false;
      }
    })();
  }, [orders, settings.autoPrintKds, settings.format, settings.copies, tenantId, storeName]);
}
