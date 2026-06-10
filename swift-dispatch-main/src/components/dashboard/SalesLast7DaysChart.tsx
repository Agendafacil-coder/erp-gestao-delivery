import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { DailySalesRow } from "@/lib/ops/dashboardMetrics";
import { fmtBRL } from "@/lib/format/currency";

type Props = {
  data: DailySalesRow[];
};

export function SalesLast7DaysChart({ data }: Props) {
  const totalRevenue = data.reduce((acc, d) => acc + d.revenue, 0);
  const totalOrders = data.reduce((acc, d) => acc + d.orders, 0);
  const hasData = totalOrders > 0;

  return (
    <section className="rounded-2xl border border-border/50 bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <header className="flex flex-col gap-4 border-b border-border/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
            <TrendingUp className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold sm:text-lg">Últimos 7 dias</h2>
            <p className="text-xs text-muted-foreground">Faturamento e volume de pedidos</p>
          </div>
        </div>
        <div className="flex gap-4 sm:gap-6">
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Faturamento
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground">{fmtBRL(totalRevenue)}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pedidos
            </p>
            <p className="text-lg font-bold tabular-nums text-foreground">{totalOrders}</p>
          </div>
        </div>
      </header>
      <div className="h-[260px] sm:h-[300px] px-2 pb-4 pt-2">
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem pedidos nos últimos 7 dias. Faça um pedido demo pelo cardápio público.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
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
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as DailySalesRow | undefined;
                  if (!row) return "";
                  return `${row.day} · ${row.label}${row.isToday ? " (hoje)" : ""}`;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                name="revenue"
                dot={(props) => {
                  const row = props.payload as DailySalesRow;
                  return (
                    <circle
                      key={props.key}
                      cx={props.cx}
                      cy={props.cy}
                      r={row.isToday ? 5 : 3}
                      fill={row.isToday ? "var(--color-primary)" : "var(--color-card)"}
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                    />
                  );
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
