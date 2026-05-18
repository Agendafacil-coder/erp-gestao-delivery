import { AlertOctagon, AlertTriangle, Bell, Sparkles, CheckCircle } from "lucide-react";
import { ALERT_COLOR, type Alert } from "@/lib/ops/mock";
import { useMemo } from "react";

type AlertsPanelProps = {
  tick: number;
  orders?: any[];
  drivers?: any[];
};

export function AlertsPanel({ tick, orders = [], drivers = [] }: AlertsPanelProps) {
  
  const liveAlerts = useMemo(() => {
    // If no dynamic data, return seed alerts
    if (orders.length === 0 && drivers.length === 0) {
      return [
        { id: "a1", level: "crit" as const, title: "SLA estourado · #4831", detail: "Pinheiros · entregador parado há 6 min", agoMin: 1 },
        { id: "a2", level: "high" as const, title: "Gargalo na cozinha", detail: "8 pedidos aguardando produção há +15 min", agoMin: 3 },
        { id: "a3", level: "high" as const, title: "Região Itaim congestionada", detail: "ETA médio +42% acima do normal", agoMin: 4 },
        { id: "a4", level: "med" as const, title: "Entregador ocioso", detail: "#E-08 Tito · 12 min sem atribuição", agoMin: 7 },
        { id: "a5", level: "med" as const, title: "Pico de pedidos previsto", detail: "IA estima +30% nos próximos 20 min", agoMin: 9 },
        { id: "a6", level: "low" as const, title: "Rota reotimizada", detail: "Agrupamento de 3 entregas em Moema", agoMin: 12 },
      ];
    }

    const alerts: Alert[] = [];

    // 1. Analyze SLA Breaches (Critical)
    const active = orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
    active.forEach((o) => {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(o.placed_at).getTime()) / 60000));
      const sla = o.sla_minutes ?? 45;
      if (elapsed > sla) {
        alerts.push({
          id: `sla-${o.id}`,
          level: "crit" as const,
          title: `SLA Estourado · ${o.code}`,
          detail: `${o.address.split(",")[0]} · tempo decorrido: ${elapsed} min`,
          agoMin: Math.max(1, elapsed - sla),
        });
      }
    });

    // 2. Analyze Kitchen Overload (High)
    const inPrep = active.filter(o => o.status === "em_preparo");
    if (inPrep.length >= 4) {
      alerts.push({
        id: "kitchen-bottleneck",
        level: "high" as const,
        title: "Gargalo de Produção na Cozinha",
        detail: `${inPrep.length} pedidos pendentes em preparo simultâneo`,
        agoMin: 2,
      });
    }

    // 3. Analyze Idle Drivers (Medium)
    const idle = drivers.filter(d => d.status === "disponivel" && d.active_orders === 0);
    idle.forEach((d, idx) => {
      if (idx < 2) { // Limit alerts count
        alerts.push({
          id: `driver-idle-${d.id}`,
          level: "med" as const,
          title: "Entregador Ocioso",
          detail: `${d.name} · disponível aguardando despacho`,
          agoMin: 5 + idx * 3,
        });
      }
    });

    // 4. Smart dispatch alerts (Low)
    const assigned = active.filter(o => o.driver_id);
    if (assigned.length > 0) {
      alerts.push({
        id: "dispatch-optim",
        level: "low" as const,
        title: "Logística Otimizada",
        detail: `Atribuição inteligente ativa para ${assigned.length} entregas`,
        agoMin: 1,
      });
    }

    // Sort by severity
    const orderMap = { crit: 0, high: 1, med: 2, low: 3 };
    return alerts.sort((a, b) => orderMap[a.level] - orderMap[b.level]);
  }, [orders, drivers]);

  return (
    <div className="glass rounded-2xl flex flex-col h-[420px] lg:h-[520px]">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-danger/15 border border-danger/30 flex items-center justify-center">
            <Bell className="size-3.5 text-danger" />
          </div>
          <div>
            <div className="font-display font-semibold leading-none">Alertas Operacionais</div>
            <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">tempo real · {liveAlerts.length} ativos</div>
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">t+{tick}s</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {liveAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <CheckCircle className="size-10 text-success/55 mb-2" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Tudo sob controle</span>
            <span className="text-[10px] mt-1 max-w-[200px]">Nenhum atraso crítico ou gargalo detectado na operação.</span>
          </div>
        ) : (
          liveAlerts.map((a) => {
            const Icon = a.level === "crit" ? AlertOctagon : a.level === "low" ? Sparkles : AlertTriangle;
            return (
              <div key={a.id} className={`group rounded-lg bg-surface/60 hover:bg-surface-elevated border-l-2 ${ALERT_COLOR[a.level]} border border-border pl-3 pr-3 py-2.5 transition-all cursor-pointer ticker`}>
                <div className="flex items-start gap-3">
                  <Icon className={`size-4 shrink-0 mt-0.5 ${ALERT_COLOR[a.level].split(" ")[1]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground leading-tight">{a.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.detail}</div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{a.agoMin}m</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {liveAlerts.filter(a => a.level === "crit").length > 0 ? "Ação imediata requerida" : "IA operacional ativa"}
        </span>
        <button className="text-xs font-medium px-3 py-1.5 rounded-md border border-primary/40 text-primary-glow hover:bg-primary/15 transition">
          Ver inteligência ↗
        </button>
      </div>
    </div>
  );
}
