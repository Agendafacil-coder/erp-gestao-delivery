import { useCallback, useEffect, useState } from "react";
import { Printer, RotateCcw } from "lucide-react";
import type { LocalOrder } from "@/lib/db/localDb";
import { printOrderLabels, type OrderLabelPayload } from "@/lib/ops/printOrderLabels";
import {
  getPrintHistory,
  recordPrintHistory,
  type PrintHistoryEntry,
} from "@/lib/ops/printHistory";
import { loadPrintSettings, PRINT_FORMAT_LABEL } from "@/lib/ops/printSettings";
import { orderRepository } from "@/lib/repositories";
import { toast } from "sonner";

type Props = {
  tenantId: string | undefined;
  storeName: string;
  orders: LocalOrder[];
};

export function KdsPrintHistory({ tenantId, storeName, orders }: Props) {
  const [history, setHistory] = useState<PrintHistoryEntry[]>(() => getPrintHistory(tenantId));
  const settings = loadPrintSettings(tenantId);

  useEffect(() => {
    setHistory(getPrintHistory(tenantId));
  }, [tenantId, orders.length]);

  const reprint = useCallback(
    async (entry: PrintHistoryEntry) => {
      if (!tenantId) return;
      const order = orders.find((o) => o.id === entry.orderId);
      if (!order) {
        toast.error("Pedido não está mais na fila");
        return;
      }
      try {
        const lines = await orderRepository.listOrderLineItems(order.id, tenantId);
        const payload: OrderLabelPayload = {
          order,
          lines: lines.map((l) => ({ name: l.name, quantity: l.quantity, notes: l.notes })),
        };
        printOrderLabels([payload], storeName, {
          format: entry.format,
          copies: settings.copies,
        });
        setHistory(recordPrintHistory(tenantId, entry));
        toast.success(`Reimpressão ${entry.code}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao reimprimir");
      }
    },
    [tenantId, storeName, orders, settings.copies],
  );

  if (!tenantId || history.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Printer className="size-3.5" />
        Últimas impressões
      </div>
      <ul className="space-y-1.5">
        {history.slice(0, 6).map((entry) => (
          <li key={`${entry.orderId}-${entry.at}`} className="flex items-center gap-2 text-xs">
            <span className="font-mono font-medium text-foreground shrink-0">{entry.code}</span>
            <span className="text-muted-foreground truncate flex-1">
              {PRINT_FORMAT_LABEL[entry.format]} ·{" "}
              {new Date(entry.at).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              type="button"
              onClick={() => void reprint(entry)}
              className="erp-btn-secondary py-1 px-2 text-[11px] shrink-0 gap-1"
            >
              <RotateCcw className="size-3" />
              Reimprimir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
