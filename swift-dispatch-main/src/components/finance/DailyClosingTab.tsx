import { useEffect, useMemo, useState } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import type {
  FinancialCostSetting,
  FinancialDailyClosing,
  FinancialExpense,
} from "@/lib/finance/types";
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
import {
  CheckCircle2,
  Circle,
  DollarSign,
  Download,
  Loader2,
  Lock,
  Receipt,
  Truck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
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
import { useFinancialCmv } from "@/hooks/useFinancialCmv";
import { cn } from "@/lib/utils";

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
  const [saving, setSaving] = useState(false);
  const [justClosed, setJustClosed] = useState(false);

  const cmv = useFinancialCmv(tenantId, orders, { from: closingDate, to: closingDate });

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

  useEffect(() => {
    setJustClosed(false);
  }, [closingDate]);

  const preview = useMemo(
    () =>
      computeFinancialSummary({
        orders,
        expenses,
        costSettings,
        referenceDate: new Date(`${closingDate}T12:00:00`),
        range: { from: closingDate, to: closingDate },
        cmvOverride: cmv.ready
          ? { total: cmv.cmvTotal, source: cmv.source }
          : undefined,
      }),
    [orders, expenses, costSettings, closingDate, cmv],
  );

  const ifoodChannel = preview.channelBreakdown.find((c) => c.channel === "ifood");
  const ifoodDayEstimate = estimateDayMarketplaceFees(
    ifoodChannel?.revenue ?? 0,
    ifoodFee?.fee_rate ?? null,
  );

  const alreadyClosed = closings.some((c) => c.closing_date.slice(0, 10) === closingDate);
  const closedToday = alreadyClosed || justClosed;

  const expectedCash = preview.paymentBreakdown.dinheiro;
  const cashCountedNum = cashCounted.trim() ? Number(cashCounted.replace(",", ".")) : null;
  const cashDiff =
    cashCountedNum != null && Number.isFinite(cashCountedNum)
      ? Number((cashCountedNum - expectedCash).toFixed(2))
      : null;

  const dayOrdersCount = filterOrdersForAccountingDay(orders, closingDate).length;

  const checklist = [
    {
      id: "orders",
      done: preview.deliveredOrdersCount > 0 || preview.periodRevenue === 0,
      label:
        preview.deliveredOrdersCount > 0
          ? `${preview.deliveredOrdersCount} pedido(s) entregue(s)`
          : "Sem entregas neste dia",
      warn: false,
    },
    {
      id: "pending",
      done: preview.pendingOrdersCount === 0,
      label:
        preview.pendingOrdersCount === 0
          ? "Nenhum pagamento pendente"
          : `${preview.pendingOrdersCount} pagamento(s) pendente(s)`,
      warn: preview.pendingOrdersCount > 0,
    },
    {
      id: "cash",
      done: cashDiff != null || expectedCash === 0,
      label:
        expectedCash === 0
          ? "Sem dinheiro em caixa no sistema"
          : cashDiff == null
            ? `Conferir dinheiro (sistema: ${formatBRL(expectedCash)})`
            : Math.abs(cashDiff) < 0.01
              ? "Dinheiro bateu com o sistema"
              : `Diferença de ${formatBRL(cashDiff)} no dinheiro`,
      warn: cashDiff != null && Math.abs(cashDiff) >= 0.01,
    },
  ];

  const handleClose = async () => {
    if (alreadyClosed) {
      toast.error("Já existe fechamento para esta data.");
      return;
    }
    setSaving(true);
    try {
      const cashNote =
        cashDiff != null
          ? `Dinheiro contado: ${formatBRL(cashCountedNum!)} (sistema ${formatBRL(expectedCash)}, dif. ${formatBRL(cashDiff)}).`
          : null;
      const combinedNotes = [cashNote, notes.trim()].filter(Boolean).join(" ");

      await onRegisterClosing({
        closing_date: `${closingDate}T12:00:00.000Z`,
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
      setJustClosed(true);
      toast.success("Turno fechado", {
        description: `Fat. ${formatBRL(preview.periodRevenue)} · lucro ${formatBRL(preview.estimatedProfit)}`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao registrar fechamento");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    downloadAccountingDayCsv(orders, closingDate, tenant?.slug ?? "loja");
    toast.success("CSV do dia baixado");
  };

  const paymentRows = (
    Object.keys(PAYMENT_METHOD_LABELS) as Array<keyof typeof PAYMENT_METHOD_LABELS>
  )
    .map((key) => ({
      key,
      label: PAYMENT_METHOD_LABELS[key],
      value: preview.paymentBreakdown[key],
    }))
    .filter((r) => r.value > 0);

  const dateLabel = new Date(`${closingDate}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="space-y-5">
      {/* Cabeçalho do turno */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Fechamento do turno
            </p>
            <h2 className="text-lg font-semibold capitalize mt-0.5">{dateLabel}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Três passos: conferir → contar dinheiro → fechar e exportar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="text-sm tabular-nums h-9 w-auto"
            />
            {closedToday ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="size-3.5" />
                Turno fechado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning">
                <Circle className="size-3.5" />
                Em aberto
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Faturamento"
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
      </div>

      {/* Passo 1 — checklist */}
      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <div>
            <AppCardTitle className="text-sm">1 · Conferir o dia</AppCardTitle>
            <AppCardDescription>Checklist rápido antes de fechar o caixa</AppCardDescription>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-3 pt-4">
          <ul className="space-y-2">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                {item.done && !item.warn ? (
                  <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                ) : item.warn ? (
                  <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
                ) : (
                  <Circle className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                )}
                <span
                  className={cn(
                    item.warn && "text-warning font-medium",
                    item.done && !item.warn && "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          {preview.cancelledOrdersCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {preview.cancelledOrdersCount} cancelado(s) ({formatBRL(preview.cancelledRevenue)}) —
              não entram no faturamento.
            </p>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pagamentos
              </p>
              {paymentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem vendas neste dia.</p>
              ) : (
                paymentRows.map((r) => (
                  <div key={r.key} className="flex justify-between text-sm gap-2">
                    <span>{r.label}</span>
                    <span className="font-mono tabular-nums shrink-0">{formatBRL(r.value)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Canais
              </p>
              {preview.channelBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem faturamento.</p>
              ) : (
                preview.channelBreakdown.map((c) => (
                  <div key={c.channel} className="space-y-0.5">
                    <div className="flex justify-between text-sm gap-2">
                      <span>
                        {c.label}{" "}
                        <span className="text-muted-foreground text-xs">({c.orders})</span>
                      </span>
                      <span className="font-mono tabular-nums shrink-0">
                        {formatBRL(c.revenue)}
                      </span>
                    </div>
                    {c.channel === "ifood" && ifoodDayEstimate ? (
                      <div className="pl-1 text-[11px] text-muted-foreground flex justify-between gap-2">
                        <span>Líquido iFood est.</span>
                        <span className="font-mono tabular-nums">
                          {formatBRL(ifoodDayEstimate.netEstimated)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Despesas {formatBRL(preview.totalExpenses)} · CMV{" "}
            {cmv.ready ? formatBRL(preview.cmvTotal) : "…"}
            {cmv.ready
              ? preview.cmvSource === "estimate"
                ? " (est.)"
                : preview.cmvSource === "recorded"
                  ? " (real)"
                  : preview.cmvSource === "menu"
                    ? " (cardápio)"
                    : ""
              : ""}
          </p>
        </AppCardContent>
      </AppCard>

      {/* Passo 2 — dinheiro */}
      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <div>
            <AppCardTitle className="text-sm">2 · Contar o dinheiro</AppCardTitle>
            <AppCardDescription>
              Opcional, mas ajuda a achar diferença no caixa
            </AppCardDescription>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-4 pt-4">
          <div className="space-y-1.5 max-w-sm">
            <Label className="erp-section-label">Valor contado no gaveteiro</Label>
            <Input
              inputMode="decimal"
              placeholder={`Esperado: ${formatBRL(expectedCash)}`}
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              disabled={closedToday}
              className="text-sm tabular-nums h-11"
            />
            {cashDiff != null ? (
              <p
                className={cn(
                  "text-xs font-medium",
                  Math.abs(cashDiff) < 0.01
                    ? "text-success"
                    : cashDiff < 0
                      ? "text-danger"
                      : "text-warning",
                )}
              >
                Diferença: {formatBRL(cashDiff)}
                {Math.abs(cashDiff) < 0.01 ? " — bateu" : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sistema espera {formatBRL(expectedCash)} em dinheiro neste dia.
              </p>
            )}
          </div>

          <DriverDayPayoutCard tenantId={tenantId} date={closingDate} />

          <div className="space-y-1.5">
            <Label className="erp-section-label">Observações do turno</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={closedToday}
              placeholder="Ex.: troco faltando, sangria, etc."
            />
          </div>
        </AppCardContent>
      </AppCard>

      {/* Passo 3 — fechar + export */}
      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <div>
            <AppCardTitle className="text-sm flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              3 · Fechar turno e exportar
            </AppCardTitle>
            <AppCardDescription>
              Registra o fechamento e gera CSV para o contador, se quiser
            </AppCardDescription>
          </div>
        </AppCardHeader>
        <AppCardContent className="space-y-3 pt-4">
          {closedToday ? (
            <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm space-y-1">
              <p className="font-medium text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                Fechamento registrado para este dia
              </p>
              <p className="text-xs text-muted-foreground">
                Você ainda pode baixar o CSV das vendas do dia.
              </p>
            </div>
          ) : (
            <Button
              type="button"
              onClick={() => void handleClose()}
              disabled={saving}
              className="erp-btn-primary w-full h-12 text-sm font-semibold"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Fechar turno · {formatBRL(preview.periodRevenue)}
            </Button>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{dayOrdersCount}</strong> pedido(s) no CSV do
              dia
            </p>
            <Button
              type="button"
              variant="outline"
              className="text-xs h-9"
              onClick={handleExport}
            >
              <Download className="size-3.5" />
              Baixar CSV
            </Button>
          </div>
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
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
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
  );
}
