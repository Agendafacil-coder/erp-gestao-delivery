import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { HourlySalesRow } from "@/lib/ops/dashboardMetrics";
import { fmtBRL } from "@/lib/format/currency";

type Props = {
  data: HourlySalesRow[];
};

export function SalesByHourChart({ data }: Props) {
  const hasData = data.some((d) => d.orders > 0 || d.revenue > 0);

  return (
    <section className="erp-card flex flex-col">
      <header className="erp-card-header">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="size-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Vendas por horário</h2>
            <p className="text-xs text-muted-foreground">Pedidos e faturamento · hoje</p>
          </div>
        </div>
      </header>
      <div className="px-2 pb-4 h-[220px] sm:h-[260px]">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sem vendas registradas hoje para montar o gráfico.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="orders"
                orientation="left"
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "revenue") return [fmtBRL(value), "Faturamento"];
                  return [value, "Pedidos"];
                }}
                labelFormatter={(label) => `Horário ${label}`}
              />
              <Bar
                yAxisId="orders"
                dataKey="orders"
                fill="var(--color-primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                name="orders"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
