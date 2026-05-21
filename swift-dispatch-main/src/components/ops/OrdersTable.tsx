import { Bike, Clock, MapPin, ChevronRight, Link2, LayoutGrid } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { STATUS_COLOR, STATUS_LABEL, fmtBRL, seedOrders, type Order } from "@/lib/ops/mock";
import { useMemo, useState } from "react";

const TABS: Array<{ key: "all" | "risco" | "rota" | "producao"; label: string; filter: (o: Order) => boolean }> = [
  { key: "all", label: "Todos", filter: () => true },
  { key: "risco", label: "Risco SLA", filter: (o) => o.priority === "high" || o.priority === "critica" },
  { key: "producao", label: "Produção", filter: (o) => ["em_preparo", "pronto", "novo"].includes(o.status) },
  { key: "rota", label: "Em rota", filter: (o) => ["em_rota_coleta", "retirado", "em_rota_entrega"].includes(o.status) },
];

export function OrdersTable({ tick, orders: propOrders }: { tick: number; orders?: Order[] }) {
  const orders = propOrders ?? seedOrders(16);
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  const filtered = orders.filter(TABS.find((t) => t.key === tab)!.filter);

  return (
    <div className="erp-card overflow-hidden">
      <div className="erp-card-header flex-wrap">
        <div>
          <div className="font-semibold text-sm leading-none">Lista operacional</div>
          <p className="text-sm text-muted-foreground mt-1">Pedidos em andamento · status no Kanban</p>
        </div>
        <Link
          to="/kanban"
          className="text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0 mr-2"
        >
          <LayoutGrid className="size-3.5" />
          Kanban
        </Link>
        <div className="segmented-control">
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-3 py-3 font-medium">Cliente · Região</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">SLA</th>
              <th className="px-3 py-3 font-medium">Distância</th>
              <th className="px-3 py-3 font-medium">ETA</th>
              <th className="px-3 py-3 font-medium">Entregador</th>
              <th className="px-3 py-3 font-medium text-right">Valor</th>
              <th className="px-3 py-3 font-medium">Rastreio</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const customerName = o.customer ?? (o as any).customer_name ?? "Cliente";
              const district = o.district ?? (o as any).address?.split(",")[0] ?? "Geral";
              const elapsed = o.elapsedMin ?? Math.max(0, Math.floor((Date.now() - new Date((o as any).placed_at ?? Date.now()).getTime()) / 60000));
              const sla = o.slaMin ?? (o as any).sla_minutes ?? 45;
              const value = o.value ?? Number((o as any).total_amount ?? 0);
              const distance = o.distanceKm ?? 1.8;
              const eta = o.etaMin ?? Math.max(5, sla - elapsed);
              
              const pct = Math.min(100, (elapsed / sla) * 100);
              const slaColor = pct > 85 ? "bg-danger" : pct > 65 ? "bg-warning" : "bg-success";
              const priority = o.priority;
              const isCritical = priority === "crit" || priority === "critica";
              const isHigh = priority === "high" || priority === "alta";
              
              const driverName = o.driver ?? (o as any).drivers?.name ?? ((o as any).driver_id ? "#E-Entregador" : null);

              return (
                <tr key={o.id} className="border-t border-border/60 hover:bg-surface-elevated/50 transition-colors duration-200 group">
                  <td className="px-5 py-3 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full ${isCritical ? "bg-danger pulse-dot" : isHigh ? "bg-warning" : "bg-success"}`} />
                      {o.code}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium leading-none">{customerName}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="size-3" />{district}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${STATUS_COLOR[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 w-32">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${slaColor} transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{elapsed}'/{sla}'</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{distance} km</td>
                  <td className="px-3 py-3 font-mono text-xs flex items-center gap-1"><Clock className="size-3 text-muted-foreground" />{eta} min</td>
                  <td className="px-3 py-3 text-xs">
                    {driverName ? (
                      <span className="inline-flex items-center gap-1.5"><Bike className="size-3 text-primary-glow" />{driverName}</span>
                    ) : (
                      <span className="text-muted-foreground italic text-[11px]">aguardando…</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{fmtBRL(value)}</td>
                  <td className="px-3 py-3">
                    {(o as { tracking_token?: string }).tracking_token ? (
                      <button
                        type="button"
                        title="Copiar link do cliente"
                        className="p-1.5 rounded-md border border-border hover:border-primary/40 text-muted-foreground hover:text-primary transition"
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
                  <td className="px-5 py-3 text-right">
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
