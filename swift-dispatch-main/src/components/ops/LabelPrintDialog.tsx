import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import type { LocalOrder } from "@/lib/db/localDb";
import { normalizeOrderStatus, STATUS_LABEL } from "@/lib/ops/orderWorkflow";
import { openPrintPreview, printOrderLabels } from "@/lib/ops/printOrderLabels";
import { recordPrintHistory } from "@/lib/ops/printHistory";
import {
  loadPrintSettings,
  PRINT_FORMAT_LABEL,
  savePrintSettings,
  type PrintFormat,
} from "@/lib/ops/printSettings";
import { orderRepository } from "@/lib/repositories";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { Switch } from "@/components/ui/switch";
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
  const [format, setFormat] = useState<PrintFormat>("kitchen");
  const [copies, setCopies] = useState(1);
  const [autoPrint, setAutoPrint] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prefs = loadPrintSettings(tenantId);
    setFormat(prefs.format);
    setCopies(prefs.copies);
    setAutoPrint(prefs.autoPrintKds);
    setSelected(
      new Set(
        printable
          .filter((o) => DEFAULT_SELECTED_STATUSES.has(normalizeOrderStatus(o.status)))
          .map((o) => o.id),
      ),
    );
  }, [open, printable, tenantId]);

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

  const buildPayloads = async () => {
    const picked = printable.filter((o) => selected.has(o.id));
    return Promise.all(
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
  };

  const persistPrefs = (nextAutoPrint = autoPrint) => {
    savePrintSettings(tenantId, { format, copies, autoPrintKds: nextAutoPrint });
  };

  const handleAutoPrintChange = (checked: boolean) => {
    setAutoPrint(checked);
    savePrintSettings(tenantId, { format, copies, autoPrintKds: checked });
    toast.success(
      checked
        ? "Pedidos novos vão imprimir sozinhos"
        : "Impressão só quando você pedir",
      { duration: 2200 },
    );
  };

  const handlePrint = async () => {
    if (selected.size === 0) {
      toast.info("Selecione ao menos um pedido.");
      return;
    }

    setPrinting(true);
    try {
      const payloads = await buildPayloads();
      printOrderLabels(payloads, storeName, { format, copies });
      for (const p of payloads) {
        recordPrintHistory(tenantId, {
          orderId: p.order.id,
          code: p.order.code,
          format,
        });
      }
      persistPrefs();
      toast.success(
        payloads.length === 1
          ? "Enviado para impressão (80mm)"
          : `${payloads.length} comandas enviadas para impressão`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao imprimir");
    } finally {
      setPrinting(false);
    }
  };

  const handlePreview = async () => {
    if (selected.size === 0) {
      toast.info("Selecione ao menos um pedido.");
      return;
    }

    setPrinting(true);
    try {
      const payloads = await buildPayloads();
      openPrintPreview(payloads, storeName, { format, copies });
      persistPrefs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha na pré-visualização");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Imprimir comandas</DialogTitle>
          <DialogDescription>
            Impressora térmica 80mm ou PDF. Escolha comanda de cozinha ou etiqueta de entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Formato</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as PrintFormat)}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="kitchen">{PRINT_FORMAT_LABEL.kitchen}</option>
              <option value="delivery">{PRINT_FORMAT_LABEL.delivery}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Cópias</label>
            <select
              value={copies}
              onChange={(e) => setCopies(Number(e.target.value))}
              className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium">Imprimir pedidos novos automaticamente</p>
            <p className="text-xs text-muted-foreground">
              Sem marcar, só imprime quando você usar este botão.
            </p>
          </div>
          <Switch
            checked={autoPrint}
            onCheckedChange={handleAutoPrintChange}
            className="shrink-0 data-[state=unchecked]:bg-border/80"
          />
        </div>

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

            <div className="max-h-[min(40vh,280px)] overflow-y-auto rounded-xl border border-border/60 divide-y divide-border/40">
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

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="erp-btn-secondary w-full sm:w-auto"
            disabled={printing}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handlePreview()}
            disabled={printing || printable.length === 0 || selected.size === 0}
            className="erp-btn-secondary gap-2 w-full sm:w-auto disabled:opacity-60"
          >
            <Eye className="size-4" />
            Pré-visualizar
          </button>
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={printing || printable.length === 0 || selected.size === 0}
            className="erp-btn-primary gap-2 w-full sm:w-auto disabled:opacity-60"
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
