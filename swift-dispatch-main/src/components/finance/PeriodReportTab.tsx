import { useMemo } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import type { FinancialCostSetting, FinancialExpense } from "@/lib/finance/types";
import { computePeriodReport, formatBRL } from "@/lib/finance/calculations";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/paymentMethods";
import { FinancialDateFilter } from "./FinancialDateFilter";
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
};

export function PeriodReportTab({
  orders,
  expenses,
  costSettings,
  from,
  to,
  onFromChange,
  onToChange,
}: Props) {
  const report = useMemo(
    () =>
      computePeriodReport({
        orders,
        expenses,
        costSettings,
        referenceDate: new Date(to),
        range: { from, to },
      }),
    [orders, expenses, costSettings, from, to],
  );

  return (
    <div className="space-y-6">
      <FinancialDateFilter from={from} to={to} onFromChange={onFromChange} onToChange={onToChange} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
        {[
          ["Faturamento", report.periodRevenue],
          ["Entregas", report.deliveryFeesReceived],
          ["Despesas", report.totalExpenses],
          ["CMV est.", report.cmvTotal],
          ["Lucro est.", report.estimatedProfit],
          ["Entregues", report.deliveredOrdersCount],
        ].map(([label, val]) => (
          <div key={String(label)} className="bg-card border border-border rounded-xl p-3">
            <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
            <div className="text-sm font-bold mt-1 tabular-nums">
              {typeof val === "number" && label !== "Entregues"
                ? formatBRL(val)
                : val}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-xs font-bold uppercase mb-4">Evolução diária</h3>
        {report.dailySeries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período.</p>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.dailySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    borderColor: "var(--border)",
                    borderRadius: 8,
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
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-xs font-bold uppercase mb-3">Pagamentos por forma</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(report.paymentBreakdown).map(([key, value]) => (
            <div key={key} className="p-3 rounded-xl bg-surface/30 border border-border/50">
              <div className="text-[10px] text-muted-foreground uppercase">
                {PAYMENT_METHOD_LABELS[key as keyof typeof PAYMENT_METHOD_LABELS]}
              </div>
              <div className="font-mono font-bold mt-1">{formatBRL(value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
