import { useMemo } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import type { FinancialCostSetting, FinancialExpense } from "@/lib/finance/types";
import { computePeriodReport, formatBRL } from "@/lib/finance/calculations";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/paymentMethods";
import { FinancialDateFilter } from "./FinancialDateFilter";
import { MetricCard } from "./MetricCard";
import { DollarSign, Truck, Receipt, PiggyBank, TrendingUp, Package } from "lucide-react";
import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardContent,
} from "@/components/design/AppCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  orders: LocalOrder[];
  expenses: FinancialExpense[];
  costSettings: FinancialCostSetting[];
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  cmvOverride?: { total: number; source: "menu" | "estimate" | "recorded" };
};

export function PeriodReportTab({
  orders,
  expenses,
  costSettings,
  from,
  to,
  onFromChange,
  onToChange,
  cmvOverride,
}: Props) {
  const report = useMemo(
    () =>
      computePeriodReport({
        orders,
        expenses,
        costSettings,
        referenceDate: new Date(to),
        range: { from, to },
        cmvOverride,
      }),
    [orders, expenses, costSettings, from, to, cmvOverride],
  );

  const miniMetrics = [
    { label: "Faturamento", value: report.periodRevenue, icon: DollarSign, formatMoney: true },
    { label: "Entregas", value: report.deliveryFeesReceived, icon: Truck, formatMoney: true },
    { label: "Despesas", value: report.totalExpenses, icon: Receipt, formatMoney: true, tone: "warning" as const },
    {
      label:
        report.cmvSource === "recorded"
          ? "CMV real"
          : report.cmvSource === "menu"
            ? "CMV"
            : "CMV est.",
      value: report.cmvTotal,
      icon: PiggyBank,
      formatMoney: true,
    },
    {
      label: "Lucro est.",
      value: report.estimatedProfit,
      icon: TrendingUp,
      formatMoney: true,
      tone: report.estimatedProfit >= 0 ? ("success" as const) : ("danger" as const),
    },
    { label: "Entregues", value: report.deliveredOrdersCount, icon: Package },
  ];

  return (
    <div className="space-y-6">
      <FinancialDateFilter from={from} to={to} onFromChange={onFromChange} onToChange={onToChange} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {miniMetrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            icon={m.icon}
            formatMoney={m.formatMoney}
            tone={m.tone}
          />
        ))}
      </div>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>Evolução diária</AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          {report.dailySeries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período.</p>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Faturamento"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Lucro (sem CMV completo)"
                    stroke="oklch(0.74 0.17 155)"
                    fill="oklch(0.74 0.17 155)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </AppCardContent>
      </AppCard>

      <AppCard>
        <AppCardHeader>
          <AppCardTitle>Pagamentos por forma</AppCardTitle>
        </AppCardHeader>
        <AppCardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(report.paymentBreakdown).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-border/50 bg-muted/30 p-3">
                <div className="erp-section-label">
                  {PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS]}
                </div>
                <div className="text-sm font-semibold tabular-nums mt-1 text-foreground">
                  {formatBRL(value)}
                </div>
              </div>
            ))}
          </div>
        </AppCardContent>
      </AppCard>
    </div>
  );
}
