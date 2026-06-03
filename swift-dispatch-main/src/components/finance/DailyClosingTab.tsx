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
import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardDescription,
  AppCardContent,
} from "@/components/design/AppCard";
import { MetricCard } from "./MetricCard";
import { DollarSign, Truck, Receipt, TrendingUp } from "lucide-react";

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
      <AppCard>
        <AppCardHeader>
          <div>
            <AppCardTitle className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              Fechamento diário
            </AppCardTitle>
            <AppCardDescription>Registre o resultado do dia na operação</AppCardDescription>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="erp-section-label">Data do fechamento</Label>
              <Input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="erp-section-label">Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            {alreadyClosed && (
              <p className="text-xs text-warning">Esta data já possui fechamento registrado.</p>
            )}
            <Button onClick={handleClose} disabled={alreadyClosed} className="erp-btn-primary w-full">
              Confirmar fechamento
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
            <MetricCard
              label="Faturamento"
              value={preview.periodRevenue}
              formatMoney
              icon={DollarSign}
              tone="success"
            />
            <MetricCard
              label="Taxas entrega"
              value={preview.deliveryFeesReceived}
              formatMoney
              icon={Truck}
            />
            <MetricCard
              label="Despesas"
              value={preview.totalExpenses}
              formatMoney
              icon={Receipt}
              tone="warning"
            />
            <MetricCard
              label="Lucro est."
              value={preview.estimatedProfit}
              formatMoney
              icon={TrendingUp}
              tone={preview.estimatedProfit >= 0 ? "success" : "danger"}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Pedidos entregues: {preview.deliveredOrdersCount} · Pagos: {preview.paidOrdersCount} ·
            Pendentes: {preview.pendingOrdersCount}
          </p>
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>Histórico de fechamentos</AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {closings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum fechamento ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {closings.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-border/50 bg-muted/30 text-xs"
                >
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>{new Date(c.closing_date).toLocaleDateString("pt-BR")}</span>
                    <span
                      className={`tabular-nums ${c.estimated_profit >= 0 ? "text-success" : "text-danger"}`}
                    >
                      {formatBRL(c.estimated_profit)}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-1 leading-relaxed">
                    Fat. {formatBRL(c.revenue)} · {c.orders_delivered} entregas · despesas{" "}
                    {formatBRL(c.expenses_total)}
                  </div>
                  {c.notes && <p className="mt-1 erp-meta">{c.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </AppCardContent>
      </AppCard>
    </div>
  );
}
