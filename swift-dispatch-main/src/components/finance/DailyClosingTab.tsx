import { useEffect, useMemo, useState } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import type { FinancialCostSetting, FinancialDailyClosing, FinancialExpense } from "@/lib/finance/types";
import { computeFinancialSummary, formatBRL } from "@/lib/finance/calculations";
import { estimateDayMarketplaceFees } from "@/lib/finance/marketplaceFees";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/paymentMethods";
import {
  getIfoodFeeEstimateFn,
  type IfoodFeeEstimateDto,
} from "@/functions/ifoodFinancial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Lock, DollarSign, Truck, Receipt, TrendingUp, AlertTriangle, Download } from "lucide-react";
import { todayIsoDate } from "./FinancialDateFilter";
import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardDescription,
  AppCardContent,
} from "@/components/design/AppCard";
import { MetricCard } from "./MetricCard";
import { DriverDayPayoutCard } from "./DriverDayPayoutCard";
import {
  downloadAccountingDayCsv,
  filterOrdersForAccountingDay,
} from "@/lib/finance/ordersDayExport";
import { useTenant } from "@/hooks/useTenant";

type Props = {
  tenantId?: string;
  orders: LocalOrder[];
  expenses: FinancialExpense[];
  costSettings: FinancialCostSetting[];
  closings: FinancialDailyClosing[];
  onRegisterClosing: (
    payload: Omit<FinancialDailyClosing, "id" | "tenant_id" | "created_at">,
  ) => Promise<void>;
};

export function DailyClosingTab({
  tenantId,
  orders,
  expenses,
  costSettings,
  closings,
  onRegisterClosing,
}: Props) {
  const { current: tenant } = useTenant();
  const [closingDate, setClosingDate] = useState(todayIsoDate());
  const [notes, setNotes] = useState("");
  const [cashCounted, setCashCounted] = useState("");
  const [ifoodFee, setIfoodFee] = useState<IfoodFeeEstimateDto | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setIfoodFee(null);
      return;
    }
    let cancelled = false;
    getIfoodFeeEstimateFn({ data: { tenantId } })
      .then((row) => {
        if (!cancelled) setIfoodFee(row);
      })
      .catch(() => {
        if (!cancelled) setIfoodFee(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

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

  const ifoodChannel = preview.channelBreakdown.find((c) => c.channel === "ifood");
  const ifoodDayEstimate = estimateDayMarketplaceFees(
    ifoodChannel?.revenue ?? 0,
    ifoodFee?.fee_rate ?? null,
  );

  const alreadyClosed = closings.some((c) => c.closing_date.slice(0, 10) === closingDate);

  const expectedCash = preview.paymentBreakdown.dinheiro;
  const cashCountedNum = cashCounted.trim() ? Number(cashCounted.replace(",", ".")) : null;
  const cashDiff =
    cashCountedNum != null && Number.isFinite(cashCountedNum)
      ? Number((cashCountedNum - expectedCash).toFixed(2))
      : null;

  const handleClose = async () => {
    if (alreadyClosed) {
      toast.error("Já existe fechamento para esta data.");
      return;
    }
    const cashNote =
      cashDiff != null
        ? `Dinheiro contado: ${formatBRL(cashCountedNum!)} (sistema ${formatBRL(expectedCash)}, dif. ${formatBRL(cashDiff)}).`
        : null;
    const combinedNotes = [cashNote, notes.trim()].filter(Boolean).join(" ");

    await onRegisterClosing({
      closing_date: new Date(closingDate).toISOString(),
      revenue: preview.periodRevenue,
      delivery_fees: preview.deliveryFeesReceived,
      expenses_total: preview.totalExpenses,
      fixed_costs: preview.fixedCosts,
      variable_costs: preview.variableCosts,
      estimated_profit: preview.estimatedProfit,
      orders_delivered: preview.deliveredOrdersCount,
      notes: combinedNotes || null,
    });
    setNotes("");
    setCashCounted("");
    toast.success("Fechamento diário registrado.");
  };

  const paymentRows = (Object.keys(PAYMENT_METHOD_LABELS) as Array<keyof typeof PAYMENT_METHOD_LABELS>)
    .map((key) => ({ key, label: PAYMENT_METHOD_LABELS[key], value: preview.paymentBreakdown[key] }))
    .filter((r) => r.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Faturamento do dia"
          value={preview.periodRevenue}
          formatMoney
          icon={DollarSign}
          tone="success"
        />
        <MetricCard
          label="Delivery / site"
          value={preview.deliveryRevenue}
          formatMoney
          icon={Truck}
        />
        <MetricCard label="Salão" value={preview.salonRevenue} formatMoney icon={Receipt} />
        <MetricCard
          label="Lucro estimado"
          value={preview.estimatedProfit}
          formatMoney
          icon={TrendingUp}
          tone={preview.estimatedProfit >= 0 ? "success" : "danger"}
        />
      </div>

      {preview.pendingOrdersCount > 0 || preview.cancelledOrdersCount > 0 ? (
        <div className="rounded-xl border border-warning/40 bg-warning/[0.08] px-4 py-3 flex items-start gap-2 text-sm">
          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {preview.pendingOrdersCount > 0 ? (
              <p>
                <strong>{preview.pendingOrdersCount}</strong> pedido(s) com pagamento pendente (
                {formatBRL(preview.pendingOrdersTotal)}) — confira antes de fechar.
              </p>
            ) : null}
            {preview.cancelledOrdersCount > 0 ? (
              <p className="text-muted-foreground">
                {preview.cancelledOrdersCount} cancelado(s) no dia (
                {formatBRL(preview.cancelledRevenue)}) — não entram no faturamento.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Export contábil do dia:{" "}
          <strong className="text-foreground">
            {filterOrdersForAccountingDay(orders, closingDate).length}
          </strong>{" "}
          pedido(s) · CSV para o contador (Excel BR)
        </div>
        <Button
          type="button"
          variant="outline"
          className="text-xs h-9"
          onClick={() => {
            downloadAccountingDayCsv(orders, closingDate, tenant?.slug ?? "loja");
            toast.success("CSV baixado");
          }}
        >
          <Download className="size-3.5" />
          Baixar CSV do dia
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppCard>
          <AppCardHeader>
            <div>
              <AppCardTitle className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                Fechamento do caixa
              </AppCardTitle>
              <AppCardDescription>
                Conferência do dia para o dono — por canal, pagamento e dinheiro em caixa
              </AppCardDescription>
            </div>
          </AppCardHeader>
          <AppCardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="erp-section-label">Data</Label>
              <Input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="text-sm tabular-nums"
              />
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Por forma de pagamento
              </p>
              {paymentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem vendas pagas neste dia.</p>
              ) : (
                paymentRows.map((r) => (
                  <div key={r.key} className="flex justify-between text-sm">
                    <span>{r.label}</span>
                    <span className="font-mono tabular-nums">{formatBRL(r.value)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Por canal
              </p>
              {preview.channelBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem faturamento neste dia.</p>
              ) : (
                preview.channelBreakdown.map((c) => (
                  <div key={c.channel} className="space-y-0.5">
                    <div className="flex justify-between text-sm gap-2">
                      <span>
                        {c.label}{" "}
                        <span className="text-muted-foreground text-xs">({c.orders})</span>
                      </span>
                      <span className="font-mono tabular-nums shrink-0">{formatBRL(c.revenue)}</span>
                    </div>
                    {c.channel === "ifood" && ifoodDayEstimate ? (
                      <div className="pl-1 text-[11px] text-muted-foreground space-y-0.5">
                        <div className="flex justify-between gap-2">
                          <span>
                            Taxa iFood est. (
                            {((ifoodFee?.fee_rate ?? 0) * 100).toFixed(1)}% ·{" "}
                            {ifoodFee?.competence ?? "—"})
                          </span>
                          <span className="font-mono tabular-nums text-danger">
                            −{formatBRL(ifoodDayEstimate.feesEstimated)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span>Líquido estimado</span>
                          <span className="font-mono tabular-nums text-foreground">
                            {formatBRL(ifoodDayEstimate.netEstimated)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {c.channel === "ifood" && !ifoodDayEstimate && ifoodChannel ? (
                      <p className="pl-1 text-[11px] text-muted-foreground">
                        Importe o extrato em Financeiro → iFood para estimar taxa e líquido do dia.
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="erp-section-label">
                Dinheiro contado no caixa (opcional)
              </Label>
              <Input
                inputMode="decimal"
                placeholder={`Esperado: ${formatBRL(expectedCash)}`}
                value={cashCounted}
                onChange={(e) => setCashCounted(e.target.value)}
                className="text-sm tabular-nums"
              />
              {cashDiff != null ? (
                <p
                  className={`text-xs ${
                    Math.abs(cashDiff) < 0.01
                      ? "text-success"
                      : cashDiff < 0
                        ? "text-danger"
                        : "text-warning"
                  }`}
                >
                  Diferença: {formatBRL(cashDiff)}
                  {Math.abs(cashDiff) < 0.01 ? " — bateu com o sistema" : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sistema espera {formatBRL(expectedCash)} em dinheiro neste dia.
                </p>
              )}
            </div>

            <DriverDayPayoutCard tenantId={tenantId} date={closingDate} />

            <div className="space-y-1.5">
              <Label className="erp-section-label">Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>

            {alreadyClosed ? (
              <p className="text-xs text-warning">Esta data já possui fechamento registrado.</p>
            ) : null}

            <Button onClick={() => void handleClose()} disabled={alreadyClosed} className="erp-btn-primary w-full">
              Confirmar fechamento
            </Button>

            <p className="text-xs text-muted-foreground">
              Entregues/pagos no salão+delivery: {preview.deliveredOrdersCount} · Pagos:{" "}
              {preview.paidOrdersCount} · Pendentes: {preview.pendingOrdersCount} · Despesas:{" "}
              {formatBRL(preview.totalExpenses)}
              {preview.cmvSource === "estimate" ? " · CMV estimado" : " · CMV do cardápio"}
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
              <div className="space-y-2 max-h-[520px] overflow-y-auto">
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
                      Fat. {formatBRL(c.revenue)} · {c.orders_delivered} pedidos · despesas{" "}
                      {formatBRL(c.expenses_total)}
                    </div>
                    {c.notes ? <p className="mt-1 erp-meta">{c.notes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </AppCardContent>
        </AppCard>
      </div>
    </div>
  );
}
