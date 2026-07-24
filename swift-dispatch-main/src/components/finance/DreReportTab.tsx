import { useMemo } from "react";
import type { LocalOrder } from "@/lib/db/localDb";
import type { FinancialCostSetting, FinancialExpense } from "@/lib/finance/types";
import { computeFinancialSummary, formatBRL } from "@/lib/finance/calculations";
import { computeDreGerencial } from "@/lib/finance/dre";
import { FinancialDateFilter } from "./FinancialDateFilter";
import { MetricCard } from "./MetricCard";
import { FileSpreadsheet, Percent, TrendingDown, TrendingUp } from "lucide-react";
import {
  AppCard,
  AppCardHeader,
  AppCardTitle,
  AppCardContent,
} from "@/components/design/AppCard";
import { cn } from "@/lib/utils";

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

export function DreReportTab({
  orders,
  expenses,
  costSettings,
  from,
  to,
  onFromChange,
  onToChange,
  cmvOverride,
}: Props) {
  const summary = useMemo(
    () =>
      computeFinancialSummary({
        orders,
        expenses,
        costSettings,
        referenceDate: new Date(to),
        range: { from, to },
        cmvOverride,
      }),
    [orders, expenses, costSettings, from, to, cmvOverride],
  );

  const dre = useMemo(() => computeDreGerencial(summary), [summary]);

  const cmvLabel =
    cmvOverride?.source === "recorded" || summary.cmvSource === "recorded"
      ? "CMV gravado"
      : cmvOverride?.source === "menu" || summary.cmvSource === "menu"
        ? "CMV do cardápio"
        : "CMV estimado";

  return (
    <div className="space-y-6">
      <FinancialDateFilter from={from} to={to} onFromChange={onFromChange} onToChange={onToChange} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Receita bruta"
          value={dre.receitaBruta}
          icon={TrendingUp}
          formatMoney
        />
        <MetricCard label={cmvLabel} value={dre.cmv} icon={TrendingDown} formatMoney />
        <MetricCard
          label="Lucro bruto"
          value={dre.lucroBruto}
          icon={FileSpreadsheet}
          formatMoney
          tone={dre.lucroBruto >= 0 ? "success" : "danger"}
        />
        <MetricCard
          label="Resultado líquido"
          value={dre.resultadoLiquido}
          icon={Percent}
          formatMoney
          tone={dre.resultadoLiquido >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Margem bruta
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">
            {dre.margemBrutaPct != null ? `${dre.margemBrutaPct}%` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Margem líquida
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">
            {dre.margemLiquidaPct != null ? `${dre.margemLiquidaPct}%` : "—"}
          </p>
        </div>
      </div>

      <AppCard>
        <AppCardHeader className="border-b border-border/40">
          <AppCardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-4" />
            DRE gerencial
          </AppCardTitle>
        </AppCardHeader>
        <AppCardContent className="p-0">
          <ul className="divide-y divide-border/40">
            {dre.lines.map((line) => (
              <li
                key={line.key}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
                  line.emphasis === "result" && "bg-muted/30 font-semibold",
                  line.emphasis === "subtotal" && "font-medium bg-muted/10",
                )}
              >
                <span
                  className={cn(
                    "text-foreground",
                    line.level === 1 && "text-muted-foreground text-[13px] pl-2",
                  )}
                >
                  {line.label}
                </span>
                <span
                  className={cn(
                    "tabular-nums shrink-0",
                    line.tone === "positive" && "text-success",
                    line.tone === "negative" && "text-danger",
                  )}
                >
                  {formatBRL(line.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="px-4 py-3 text-[11px] text-muted-foreground leading-relaxed border-t border-border/40">
            DRE gerencial para o dono acompanhar o resultado — não substitui a contabilidade
            oficial. O CMV usa fichas técnicas / custo unitário quando disponíveis; senão,
            estimativa de 65% sobre a venda de produtos.
          </p>
        </AppCardContent>
      </AppCard>
    </div>
  );
}
