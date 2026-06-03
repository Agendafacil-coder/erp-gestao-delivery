import { useMemo, useState } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import type { FinancialCostSetting, FinancialDailyClosing, FinancialExpense } from "@/lib/finance/types";
import { computeFinancialSummary, formatBRL } from "@/lib/finance/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { todayIsoDate } from "./FinancialDateFilter";

type Props = {
  orders: LocalOrder[];
  expenses: FinancialExpense[];
  costSettings: FinancialCostSetting[];
  closings: FinancialDailyClosing[];
  onRegisterClosing: (
    payload: Omit<FinancialDailyClosing, "id" | "tenant_id" | "created_at">,
  ) => Promise<void>;
};

export function DailyClosingTab({
  orders,
  expenses,
  costSettings,
  closings,
  onRegisterClosing,
}: Props) {
  const [closingDate, setClosingDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");

  const preview = useMemo(
    () =>
      computeFinancialSummary({
        orders,
        expenses,
        costSettings,
        referenceDate: new Date(closingDate),
        range: { from: closingDate, to: closingDate },
      }),
    [orders, expenses, costSettings, closingDate],
  );

  const alreadyClosed = closings.some(
    (c) => c.closing_date.slice(0, 10) === closingDate,
  );

  const handleClose = async () => {
    if (alreadyClosed) {
      toast.error("Já existe fechamento para esta data.");
      return;
    }
    await onRegisterClosing({
      closing_date: new Date(closingDate).toISOString(),
      revenue: preview.periodRevenue,
      delivery_fees: preview.deliveryFeesReceived,
      expenses_total: preview.totalExpenses,
      fixed_costs: preview.fixedCosts,
      variable_costs: preview.variableCosts,
      estimated_profit: preview.estimatedProfit,
      orders_delivered: preview.deliveredOrdersCount,
      notes: notes.trim() || null,
    });
    setNotes("");
    toast.success("Fechamento diário registrado.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Lock className="size-4" /> Fechamento diário
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Data do fechamento</Label>
            <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          {alreadyClosed && (
            <p className="text-xs text-warning">Esta data já possui fechamento registrado.</p>
          )}
          <Button onClick={handleClose} disabled={alreadyClosed} className="w-full">
            Confirmar fechamento
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-border pt-4">
          <div className="p-2 rounded-lg bg-surface/40">Faturamento: {formatBRL(preview.periodRevenue)}</div>
          <div className="p-2 rounded-lg bg-surface/40">Taxas entrega: {formatBRL(preview.deliveryFeesReceived)}</div>
          <div className="p-2 rounded-lg bg-surface/40">Despesas: {formatBRL(preview.totalExpenses)}</div>
          <div className="p-2 rounded-lg bg-surface/40">Lucro est.: {formatBRL(preview.estimatedProfit)}</div>
          <div className="p-2 rounded-lg bg-surface/40 col-span-2">
            Pedidos entregues: {preview.deliveredOrdersCount} · Pagos: {preview.paidOrdersCount} · Pendentes:{" "}
            {preview.pendingOrdersCount}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase">Histórico de fechamentos</h3>
        {closings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum fechamento ainda.</p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {closings.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl border border-border/50 bg-surface/30 text-xs font-mono"
              >
                <div className="flex justify-between font-semibold text-foreground">
                  <span>{new Date(c.closing_date).toLocaleDateString("pt-BR")}</span>
                  <span className={c.estimated_profit >= 0 ? "text-success" : "text-danger"}>
                    {formatBRL(c.estimated_profit)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1">
                  Fat. {formatBRL(c.revenue)} · {c.orders_delivered} entregas · despesas{" "}
                  {formatBRL(c.expenses_total)}
                </div>
                {c.notes && <p className="mt-1 text-[10px] text-muted-foreground">{c.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
