import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import type { LocalOrder } from "@/lib/db/localDb";
import { normalizeOrderStatus, STATUS_LABEL } from "@/lib/ops/orderWorkflow";
import { printOrderLabels } from "@/lib/ops/printOrderLabels";
import { orderRepository } from "@/lib/repositories";
import { StatusBadge } from "@/components/ops/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LabelPrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: LocalOrder[];
  tenantId: string;
  storeName: string;
};

const DEFAULT_SELECTED_STATUSES = new Set([
  "novo",
  "em_preparo",
  "pronto",
  "aguardando_entregador",
]);

function isPrintable(order: LocalOrder): boolean {
  const status = normalizeOrderStatus(order.status);
  return status !== "entregue" && status !== "cancelado";
}

export function LabelPrintDialog({
  open,
  onOpenChange,
  orders,
  tenantId,
  storeName,
}: LabelPrintDialogProps) {
  const printable = useMemo(
    () =>
      [...orders]
        .filter(isPrintable)
        .sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime()),
    [orders],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(
      new Set(
        printable
          .filter((o) => DEFAULT_SELECTED_STATUSES.has(normalizeOrderStatus(o.status)))
          .map((o) => o.id),
      ),
    );
  }, [open, printable]);

  const allSelected = printable.length > 0 && selected.size === printable.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(printable.map((o) => o.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = async () => {
    const picked = printable.filter((o) => selected.has(o.id));
    if (picked.length === 0) {
      toast.info("Selecione ao menos um pedido.");
      return;
    }

    setPrinting(true);
    try {
      const payloads = await Promise.all(
        picked.map(async (order) => {
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

      printOrderLabels(payloads, storeName);
      toast.success(
        picked.length === 1
          ? "Etiqueta enviada para impressão"
          : `${picked.length} etiquetas enviadas para impressão`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao imprimir etiquetas");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Imprimir etiquetas</DialogTitle>
          <DialogDescription>
            Selecione os pedidos e envie para a impressora térmica ou PDF (80mm).
          </DialogDescription>
        </DialogHeader>

        {printable.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Não há pedidos ativos para imprimir.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-4 rounded border-border accent-primary"
              />
              Selecionar todos ({printable.length})
            </label>

            <div className="max-h-[min(50vh,320px)] overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
              {printable.map((order) => {
                const checked = selected.has(order.id);
                return (
                  <label
                    key={order.id}
                    className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(order.id)}
                      className="mt-1 size-4 shrink-0 rounded border-border accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-sm">{order.code}</span>
                        <StatusBadge status={order.status} />
                      </span>
                      <span className="block text-sm text-foreground truncate">
                        {order.customer_name}
                      </span>
                      <span className="block text-xs text-muted-foreground truncate">
                        {order.address}
                      </span>
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                      {STATUS_LABEL[normalizeOrderStatus(order.status)]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="erp-btn-secondary"
            disabled={printing}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={printing || printable.length === 0 || selected.size === 0}
            className="erp-btn-primary gap-2 disabled:opacity-60"
          >
            {printing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Printer className="size-4" />
            )}
            Imprimir {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
