import { Bike, Clock, MapPin, ChevronRight, Link2, LayoutGrid } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { fmtBRL, type Order } from "@/lib/ops/mock";
import type { OrderStatus } from "@/lib/ops/orderWorkflow";
import { isOrderDelayed as isDelayedByTime } from "@/lib/ops/orderWorkflow";
import { OrderDetailPanel } from "@/components/ops/OrderDetailPanel";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { StatusBadge } from "@/components/ops/StatusBadge";
import { EmptyState } from "@/components/ops/StateViews";
import { slaBarClass } from "@/lib/ops/statusTheme";
import { useMemo, useState } from "react";

const TABS: Array<{
  key: "all" | "risco" | "rota" | "producao";
  label: string;
  filter: (o: Order) => boolean;
}> = [
  { key: "all", label: "Todos", filter: () => true },
  {
    key: "risco",
    label: "Risco SLA",
    filter: (o) => {
      const p = o.priority as string;
      return p === "high" || p === "crit" || p === "alta" || p === "critica";
    },
  },
  {
    key: "producao",
    label: "Produção",
    filter: (o) => ["em_preparo", "pronto", "novo", "confirmado"].includes(o.status),
  },
  {
    key: "rota",
    label: "Em rota",
    filter: (o) => ["aguardando_entregador", "em_rota_entrega"].includes(o.status),
  },
];

export function OrdersTable({ tick, orders: propOrders }: { tick: number; orders?: Order[] }) {
  const { current } = useTenant();
  const { drivers } = useOps();
  const orders = propOrders ?? [];
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const filtered = useMemo(
    () => orders.filter(TABS.find((t) => t.key === tab)!.filter),
    [orders, tab, tick],
  );

  return (
    <div className="erp-card overflow-hidden">
      <div className="erp-card-header flex-wrap gap-3">
        <div>
          <div className="font-semibold text-sm leading-none">Lista operacional</div>
          <p className="text-sm text-muted-foreground mt-1">Pedidos em andamento · status no Kanban</p>
        </div>
        <Link
          to="/kanban"
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0"
        >
          <LayoutGrid className="size-3.5" />
          Kanban
        </Link>
        <div className="segmented-control w-full sm:w-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              data-active={tab === t.key}
              className="segmented-item text-xs"
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum pedido neste filtro"
          description="Altere o filtro ou aguarde novos pedidos na operação."
          size="sm"
          className="border-0 rounded-none bg-transparent"
        />
      ) : (
        <>
          {/* Cards — mobile */}
          <div className="md:hidden divide-y divide-border p-3 space-y-3">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} onOpen={() => setDetailId(o.id)} />
            ))}
          </div>

          {/* Tabela — tablet/desktop */}
          <div className="erp-table-wrap hidden md:block">
            <table className="erp-table">
              <thead>
                <tr>
                  <th className="pl-5">Pedido</th>
                  <th>Cliente · Região</th>
                  <th>Status</th>
                  <th>SLA</th>
                  <th>Distância</th>
                  <th>ETA</th>
                  <th>Entregador</th>
                  <th className="text-right">Valor</th>
                  <th>Rastreio</th>
                  <th className="pr-5 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <OrderRow key={o.id} order={o} onOpen={() => setDetailId(o.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {detailId && current && (() => {
        const lo = orders.find((o) => o.id === detailId) as LocalOrder | undefined;
        if (!lo) return null;
        const driverName = lo.driver_id ? drivers.find((d) => d.id === lo.driver_id)?.name : null;
        return (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/40"
              aria-label="Fechar"
              onClick={() => setDetailId(null)}
            />
            <OrderDetailPanel
              order={lo}
              drivers={drivers}
              driverName={driverName}
              tenantId={current.id}
              onClose={() => setDetailId(null)}
            />
          </>
        );
      })()}
    </div>
  );
}

function orderMetrics(o: Order) {
  const customerName = o.customer ?? (o as { customer_name?: string }).customer_name ?? "Cliente";
  const district =
    o.district ?? (o as { address?: string }).address?.split(",")[0] ?? "Geral";
  const elapsed =
    o.elapsedMin ??
    Math.max(
      0,
      Math.floor(
        (Date.now() - new Date((o as { placed_at?: string }).placed_at ?? Date.now()).getTime()) /
          60000,
      ),
    );
  const sla = o.slaMin ?? (o as { sla_minutes?: number }).sla_minutes ?? 45;
  const value = o.value ?? Number((o as { total_amount?: number }).total_amount ?? 0);
  const distance = o.distanceKm ?? 1.8;
  const eta = o.etaMin ?? Math.max(5, sla - elapsed);
  const pct = Math.min(100, (elapsed / sla) * 100);
  const priority = o.priority as string;
  const isCritical = priority === "crit" || priority === "critica";
  const isHigh = priority === "high" || priority === "alta";
  const driverName =
    o.driver ??
    (o as { drivers?: { name: string } }).drivers?.name ??
    ((o as { driver_id?: string }).driver_id ? "Entregador" : null);

  return {
    customerName,
    district,
    elapsed,
    sla,
    value,
    distance,
    eta,
    pct,
    isCritical,
    isHigh,
    driverName,
  };
}

function OrderRow({ order: o, onOpen }: { order: Order; onOpen: () => void }) {
  const m = orderMetrics(o);

  return (
    <tr className="group cursor-pointer hover:bg-muted/30" onClick={onOpen}>
      <td className="pl-5 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${m.isCritical ? "bg-danger pulse-dot" : m.isHigh ? "bg-warning" : "bg-success"}`}
          />
          {o.code}
        </div>
      </td>
      <td>
        <div className="font-medium leading-none">{m.customerName}</div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="size-3" />
          {m.district}
        </div>
      </td>
      <td>
        <StatusBadge status={o.status as OrderStatus} elapsedMin={m.elapsed} slaMin={m.sla} />
      </td>
      <td className="w-32">
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${slaBarClass(m.elapsed, m.sla)}`} style={{ width: `${m.pct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
            {m.elapsed}&apos;/{m.sla}&apos;
          </span>
        </div>
      </td>
      <td className="font-mono text-xs tabular-nums">{m.distance} km</td>
      <td className="font-mono text-xs tabular-nums">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3 text-muted-foreground" />
          {m.eta} min
        </span>
      </td>
      <td className="text-xs">
        {m.driverName ? (
          <span className="inline-flex items-center gap-1.5">
            <Bike className="size-3 text-primary" />
            {m.driverName}
          </span>
        ) : (
          <span className="text-muted-foreground italic text-[11px]">aguardando…</span>
        )}
      </td>
      <td className="text-right font-mono text-sm tabular-nums">{fmtBRL(m.value)}</td>
      <td>
        {(o as { tracking_token?: string }).tracking_token ? (
          <button
            type="button"
            title="Copiar link do cliente"
            className="ops-icon-btn size-8"
            onClick={() => {
              const token = (o as { tracking_token: string }).tracking_token;
              const url = `${window.location.origin}/rastreio/${o.id}/${token}`;
              void navigator.clipboard.writeText(url);
              toast.success("Link de rastreio copiado!");
            }}
          >
            <Link2 className="size-3.5" />
          </button>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </td>
      <td className="pr-5 text-right">
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition inline" />
      </td>
    </tr>
  );
}

function OrderCard({ order: o, onOpen }: { order: Order; onOpen: () => void }) {
  const m = orderMetrics(o);
  const placed = (o as { placed_at?: string }).placed_at;
  const delayed =
    placed && isDelayedByTime(placed, m.sla);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`rounded-xl border bg-card p-3.5 space-y-2.5 shadow-sm cursor-pointer hover:shadow-md transition ${
        delayed ? "border-danger/50 ring-1 ring-danger/20" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{o.code}</div>
          <div className="font-semibold text-sm mt-0.5">{m.customerName}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-3" />
            {m.district}
          </div>
        </div>
        <StatusBadge status={o.status as OrderStatus} elapsedMin={m.elapsed} slaMin={m.sla} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{fmtBRL(m.value)}</span>
        <span>{m.distance} km</span>
        <span>{m.eta} min ETA</span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className={slaBarClass(m.elapsed, m.sla)} style={{ width: `${m.pct}%` }} />
      </div>
    </article>
  );
}
