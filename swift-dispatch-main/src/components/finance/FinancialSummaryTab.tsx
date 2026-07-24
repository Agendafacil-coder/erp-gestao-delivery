import { useMemo, useState } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import type { FinancialCostSetting, FinancialExpense } from "@/lib/finance/types";
import { computeFinancialSummary } from "@/lib/finance/calculations";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/paymentMethods";
import { MetricCard } from "./MetricCard";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  Truck,
  PiggyBank,
  CreditCard,
  Receipt,
  ChevronDown,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FinancialDateFilter } from "./FinancialDateFilter";
import type { CmvComputation } from "@/hooks/useFinancialCmv";
import { CmvEstimateBanner } from "@/components/finance/CmvEstimateBanner";
import { CmvSetupChecklist } from "@/components/finance/CmvSetupChecklist";
import { useInventoryOverview } from "@/hooks/useInventoryOverview";
import { AppCard, AppCardHeader, AppCardTitle } from "@/components/design/AppCard";
import { cn } from "@/lib/utils";

type Props = {
  tenantId?: string;
  orders: LocalOrder[];
  expenses: FinancialExpense[];
  costSettings: FinancialCostSetting[];
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  cmvOverride?: { total: number; source: "menu" | "estimate" | "recorded" };
  cmvMeta?: CmvComputation;
  onOpenCustos?: () => void;
};

export function FinancialSummaryTab({
  tenantId,
  orders,
  expenses,
  costSettings,
  from,
  to,
  onFromChange,
  onToChange,
  cmvOverride,
  cmvMeta,
  onOpenCustos,
}: Props) {
  const [showDetails, setShowDetails] = useState(false);
  const { items: inventoryItems } = useInventoryOverview(tenantId);
  const ref = useMemo(() => new Date(to), [to]);
  const summary = useMemo(
    () =>
      computeFinancialSummary({
        orders,
        expenses,
        costSettings,
        referenceDate: ref,
        range: { from, to },
        cmvOverride,
      }),
    [orders, expenses, costSettings, from, to, ref, cmvOverride],
  );

  const paymentChart = useMemo(
    () =>
      Object.entries(summary.paymentBreakdown).map(([key, value]) => ({
        name: PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS],
        value,
      })),
    [summary.paymentBreakdown],
  );

  return (
    <div className="space-y-6">
      {tenantId ? (
        <CmvSetupChecklist
          tenantId={tenantId}
          items={inventoryItems}
          variant="compact"
          onOpenCustos={onOpenCustos}
        />
      ) : null}

      <CmvEstimateBanner
        source={cmvMeta?.source ?? summary.cmvSource}
        itemsWithoutCost={cmvMeta?.itemsWithoutCost}
        ordersWithCmv={cmvMeta?.ordersWithCmv}
        ready={cmvMeta?.ready ?? true}
      />

      <FinancialDateFilter
        from={from}
        to={to}
        onFromChange={onFromChange}
        onToChange={onToChange}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={from === to ? "Faturamento diário" : "Faturamento do período"}
          value={from === to ? summary.dailyRevenue : summary.periodRevenue}
          formatMoney
          icon={DollarSign}
          tone="success"
          sub={`${summary.deliveredOrdersCount} pedidos entregues`}
        />
        <MetricCard
          label="Lucro estimado"
          value={summary.estimatedProfit}
          formatMoney
          icon={TrendingUp}
          tone={summary.estimatedProfit >= 0 ? "success" : "danger"}
          sub="Após despesas e custo dos produtos"
        />
        <MetricCard
          label="Despesas totais"
          value={summary.totalExpenses}
          formatMoney
          icon={Receipt}
          tone="warning"
          sub={`Fixos ${summary.fixedCosts.toFixed(0)} + variáveis ${summary.variableCosts.toFixed(0)}`}
        />
        <MetricCard
          label={
            summary.cmvSource === "recorded"
              ? "CMV real (entregas)"
              : summary.cmvSource === "menu"
                ? "Custo dos produtos"
                : "Custo estimado"
          }
          value={summary.cmvTotal}
          formatMoney
          icon={PiggyBank}
          sub={
            summary.cmvSource === "recorded"
              ? `${cmvMeta?.ordersWithCmv ?? 0} pedidos com CMV gravado`
              : summary.cmvSource === "menu"
                ? `${cmvMeta?.itemsWithCost ?? 0} itens com custo`
                : "Cadastre custo no cardápio"
          }
        />
      </div>

      <button
        type="button"
        onClick={() => setShowDetails((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition"
      >
        <ChevronDown className={cn("size-3.5 transition", showDetails && "rotate-180")} />
        {showDetails ? "Ocultar detalhes" : "Ver pagamentos e mais detalhes"}
      </button>

      {showDetails ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Taxas de entrega"
            value={summary.deliveryFeesReceived}
            formatMoney
            icon={Truck}
            sub="Recebidas em pedidos entregues"
          />
          <MetricCard
            label="Pedidos pagos"
            value={summary.paidOrdersCount}
            icon={Wallet}
            sub={summary.paidOrdersTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          />
          <MetricCard
            label="Pedidos pendentes"
            value={summary.pendingOrdersCount}
            icon={Clock}
            tone="warning"
            sub={summary.pendingOrdersTotal.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          />
          <MetricCard
            label="Faturamento produtos"
            value={summary.grossProductRevenue}
            formatMoney
            icon={CreditCard}
            sub="Sem taxa de entrega"
          />
        </div>
      ) : null}

      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <AppCardTitle>Pagamentos por forma</AppCardTitle>
        </AppCardHeader>
        <div className="px-5 py-4 sm:px-6">
          {paymentChart.every((p) => p.value === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum pedido entregue no período selecionado.
            </p>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    formatter={(v: number) =>
                      v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    }
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </AppCard>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Regra: só pedidos <strong className="text-foreground font-medium">entregues</strong> entram
        no faturamento. Cancelados são ignorados. O custo dos produtos usa{" "}
        <strong className="text-foreground font-medium">preço de custo</strong> do cardápio quando
        informado; senão usamos uma estimativa de 65% do faturamento.
      </p>
    </div>
  );
}
