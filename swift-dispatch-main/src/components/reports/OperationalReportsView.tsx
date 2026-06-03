import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Clock,
  MapPin,
  Package,
  Users,
  XCircle,
  Bike,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/finance/MetricCard";
import { OperationalDateFilter } from "./OperationalDateFilter";
import type { OperationalReportsSnapshot, ReportDatePreset } from "@/lib/ops/operationalReports";
import { rangeFromPreset } from "@/lib/ops/operationalReports";
import { formatBRL } from "@/lib/finance/calculations";
import { fmtBRL } from "@/lib/format/currency";
import type { RankRow } from "@/lib/ops/operationalReports";
import { ResponsiveTable } from "@/components/ui/responsive-table";

const PIE_COLORS = [
  "var(--primary)",
  "oklch(0.74 0.17 155)",
  "oklch(0.75 0.15 85)",
  "oklch(0.65 0.2 25)",
  "#94a3b8",
  "#6366f1",
];

type Props = {
  report: OperationalReportsSnapshot;
  loading?: boolean;
  preset: ReportDatePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (p: ReportDatePreset) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
};

function RankTable({ rows, valueLabel = "Faturamento" }: { rows: RankRow[]; valueLabel?: string }) {
  return (
    <ResponsiveTable
      rows={rows}
      rowKey={(r) => r.label}
      tableClassName="text-xs"
      columns={[
        {
          key: "rank",
          header: "#",
          hideOnMobile: true,
          render: (_, i) => i + 1,
        },
        {
          key: "label",
          header: "Item",
          mobilePrimary: true,
          render: (r) => r.label,
        },
        {
          key: "orders",
          header: "Qtd",
          label: "Quantidade",
          headerClassName: "text-right",
          cellClassName: "text-right",
          render: (r) => r.orders,
        },
        {
          key: "revenue",
          header: valueLabel,
          headerClassName: "text-right",
          cellClassName: "text-right",
          render: (r) => formatBRL(r.revenue),
        },
      ]}
    />
  );
}

export function OperationalReportsView({
  report,
  loading,
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
}: Props) {
  const rangeLabel = (() => {
    const r = rangeFromPreset(preset, { from: customFrom, to: customTo });
    return r.from === r.to ? r.from : `${r.from} → ${r.to}`;
  })();

  const s = report.summary;
  const hasHourData = report.salesByHour.some((h) => h.orders > 0);

  return (
    <div className="space-y-5">
      <OperationalDateFilter
        preset={preset}
        from={customFrom}
        to={customTo}
        onPresetChange={onPresetChange}
        onFromChange={onCustomFromChange}
        onToChange={onCustomToChange}
      />
      <p className="text-[10px] text-muted-foreground font-mono">
        Período: {rangeLabel}
        {loading ? " · atualizando…" : ""}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Faturamento"
          value={s.revenue}
          formatMoney
          icon={TrendingUp}
          tone="success"
          sub={`${s.deliveredOrders} entregues`}
        />
        <MetricCard
          label="Pedidos"
          value={s.totalOrders}
          icon={Package}
          sub={`Ticket médio ${formatBRL(s.avgTicket)}`}
        />
        <MetricCard
          label="Cancelamentos"
          value={s.cancelledOrders}
          icon={XCircle}
          tone={s.cancelledOrders > 0 ? "danger" : "default"}
          sub={`${s.cancelRatePct}% do período`}
        />
        <MetricCard
          label="Prep. médio"
          value={s.avgPrepMin != null ? `${s.avgPrepMin} min` : "—"}
          icon={Clock}
          sub="Até sair para entrega"
        />
        <MetricCard
          label="Entrega média"
          value={s.avgDeliveryMin != null ? `${s.avgDeliveryMin} min` : "—"}
          icon={Bike}
          sub="Coleta → entrega"
        />
      </div>

      <Tabs defaultValue="vendas" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/60 p-1 w-full">
          <TabsTrigger value="vendas" className="text-xs min-h-[2.5rem] flex-1 sm:flex-none px-3">
            Vendas
          </TabsTrigger>
          <TabsTrigger value="produtos" className="text-xs min-h-[2.5rem] flex-1 sm:flex-none px-3">
            Produtos
          </TabsTrigger>
          <TabsTrigger value="operacao" className="text-xs min-h-[2.5rem] flex-1 sm:flex-none px-3">
            Operação
          </TabsTrigger>
          <TabsTrigger value="clientes" className="text-xs min-h-[2.5rem] flex-1 sm:flex-none px-3">
            Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase mb-1 flex items-center gap-2">
              <TrendingUp className="size-3.5" />
              Vendas por dia
            </h3>
            <p className="text-[10px] text-muted-foreground mb-4">Pedidos e faturamento de entregues</p>
            {report.salesByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem vendas no período.</p>
            ) : (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        borderColor: "var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) =>
                        name === "revenue" ? [formatBRL(value), "Faturamento"] : [value, "Pedidos"]
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      name="Pedidos"
                      stroke="#94a3b8"
                      fill="#94a3b8"
                      fillOpacity={0.1}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="revenue"
                      stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase mb-1 flex items-center gap-2">
              <BarChart3 className="size-3.5" />
              Vendas por horário
            </h3>
            <p className="text-[10px] text-muted-foreground mb-4">Volume de pedidos por hora do dia</p>
            {!hasHourData ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem pedidos no período.</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.salesByHour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) =>
                        name === "revenue" ? [fmtBRL(value), "Faturamento"] : [value, "Pedidos"]
                      }
                    />
                    <Bar dataKey="orders" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <Package className="size-3.5" />
                Vendas por produto
              </h3>
              <RankTable rows={report.salesByProduct} />
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
                <Package className="size-3.5" />
                Vendas por categoria
              </h3>
              {report.salesByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.salesByCategory.slice(0, 6)}
                        dataKey="revenue"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {report.salesByCategory.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatBRL(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <RankTable rows={report.salesByCategory} />
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
              <MapPin className="size-3.5" />
              Vendas por bairro
            </h3>
            <RankTable rows={report.salesByNeighborhood} />
          </div>
        </TabsContent>

        <TabsContent value="operacao" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase mb-3">Motivos de cancelamento</h3>
              {report.cancelReasons.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum cancelamento no período.
                </p>
              ) : (
                <div className="space-y-2">
                  {report.cancelReasons.map((r) => (
                    <div
                      key={r.reason}
                      className="flex justify-between items-center text-xs border-b border-border/40 py-2"
                    >
                      <span>{r.reason}</span>
                      <span className="font-mono font-bold tabular-nums">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase mb-3">Tempos médios</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface/30 border border-border/50 p-4">
                  <div className="text-[10px] uppercase text-muted-foreground">Preparo</div>
                  <div className="text-2xl font-black font-mono mt-1">
                    {s.avgPrepMin != null ? `${s.avgPrepMin} min` : "—"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Pedido → saída para entrega</p>
                </div>
                <div className="rounded-xl bg-surface/30 border border-border/50 p-4">
                  <div className="text-[10px] uppercase text-muted-foreground">Entrega</div>
                  <div className="text-2xl font-black font-mono mt-1">
                    {s.avgDeliveryMin != null ? `${s.avgDeliveryMin} min` : "—"}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Coleta → cliente</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase mb-3">Pedidos cancelados</h3>
            <ResponsiveTable
              rows={report.cancelledOrders}
              rowKey={(o) => o.id}
              emptyMessage="Nenhum cancelamento."
              tableClassName="text-xs"
              columns={[
                {
                  key: "code",
                  header: "Código",
                  mobilePrimary: true,
                  render: (o) => <span className="font-mono">{o.code}</span>,
                },
                {
                  key: "customer",
                  header: "Cliente",
                  render: (o) => o.customer,
                },
                {
                  key: "channel",
                  header: "Canal",
                  render: (o) => <span className="text-muted-foreground">{o.channel}</span>,
                },
                {
                  key: "total",
                  header: "Valor",
                  headerClassName: "text-right",
                  cellClassName: "text-right font-mono",
                  render: (o) => formatBRL(o.total),
                },
              ]}
            />
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase mb-3 flex items-center gap-2">
              <Bike className="size-3.5" />
              Desempenho por entregador
            </h3>
            <ResponsiveTable
              rows={report.driverPerformance}
              rowKey={(d) => d.id}
              emptyMessage="Sem entregas no período."
              tableClassName="text-xs"
              columns={[
                {
                  key: "name",
                  header: "Entregador",
                  mobilePrimary: true,
                  render: (d) => d.name,
                },
                {
                  key: "deliveries",
                  header: "Entregas",
                  headerClassName: "text-right",
                  cellClassName: "text-right font-mono",
                  render: (d) => d.deliveries,
                },
                {
                  key: "revenue",
                  header: "Faturamento",
                  headerClassName: "text-right",
                  cellClassName: "text-right font-mono",
                  render: (d) => formatBRL(d.revenue),
                },
                {
                  key: "avg",
                  header: "Tempo médio",
                  label: "Tempo",
                  headerClassName: "text-right",
                  cellClassName: "text-right font-mono",
                  render: (d) => (d.avgDeliveryMin != null ? `${d.avgDeliveryMin} min` : "—"),
                },
              ]}
            />
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase mb-1 flex items-center gap-2">
                <Users className="size-3.5" />
                Clientes recorrentes
              </h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                2+ pedidos no período · {s.recurringCustomers} clientes
              </p>
              {report.recurringCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum recorrente ainda.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {report.recurringCustomers.map((c) => (
                    <li
                      key={c.key}
                      className="flex justify-between gap-2 border-b border-border/30 py-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.name}</div>
                        <div className="text-muted-foreground font-mono text-[10px]">
                          {c.orders} pedidos · {formatBRL(c.revenue)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase mb-1 flex items-center gap-2">
                <Users className="size-3.5" />
                Clientes inativos
              </h3>
              <p className="text-[10px] text-muted-foreground mb-3">
                Já compraram, mas não no período · {s.inactiveCustomers} clientes
              </p>
              {report.inactiveCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Todos os clientes compraram no período.
                </p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {report.inactiveCustomers.map((c) => (
                    <li
                      key={c.key}
                      className="flex justify-between gap-2 border-b border-border/30 py-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{c.name}</div>
                        <div className="text-muted-foreground font-mono text-[10px]">
                          Último:{" "}
                          {new Date(c.lastOrderAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
