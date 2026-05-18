import { useOps } from "@/hooks/useOps";
import { Bike, ShieldAlert, CheckCircle, Star, Compass, Award, Shield } from "lucide-react";
import { useMemo } from "react";

export function DriversGrid({ tick }: { tick: number }) {
  const { drivers, orders } = useOps();

  const driverStats = useMemo(() => {
    return drivers.map((d) => {
      // Find the active order assigned to this driver
      const activeOrder = orders.find(
        (o) => o.driver_id === d.id && !["entregue", "cancelado"].includes(o.status)
      );

      let orderElapsed = 0;
      let orderSla = 40;
      let delayRisk: "none" | "low" | "high" = "none";
      
      if (activeOrder) {
        orderElapsed = Math.max(0, Math.floor((Date.now() - new Date(activeOrder.placed_at).getTime()) / 60000));
        orderSla = activeOrder.sla_minutes ?? 40;
        
        if (orderElapsed > orderSla * 0.75) {
          delayRisk = "high";
        } else if (orderElapsed > orderSla * 0.5) {
          delayRisk = "low";
        }
      }

      // Generate stable deterministic ratings/efficiency for realism
      let charCodeSum = 0;
      for (let i = 0; i < d.name.length; i++) charCodeSum += d.name.charCodeAt(i);
      
      const avgTime = 22 + (charCodeSum % 10); // average delivery time (22 - 32 min)
      const rating = (4.5 + (charCodeSum % 5) * 0.1).toFixed(1); // rating (4.5 - 4.9)
      const efficiency = 92 + (charCodeSum % 8); // efficiency (92% - 99%)
      const completedCount = 45 + (charCodeSum % 150); // total deliveries this week

      return {
        ...d,
        activeOrder,
        orderElapsed,
        orderSla,
        delayRisk,
        avgTime,
        rating,
        efficiency,
        completedCount
      };
    });
  }, [drivers, orders, tick]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {driverStats.map((d) => {
        // Status config
        const statusConfig = {
          disponivel: {
            label: "SINAL LIVE",
            color: "text-success border-success/30 bg-success/5 shadow-success/5",
            dotColor: "bg-success"
          },
          em_rota: {
            label: "EM ROTA",
            color: "text-primary-glow border-primary/30 bg-primary/5 shadow-primary/5",
            dotColor: "bg-primary-glow"
          },
          ocioso: {
            label: "OCIOSO",
            color: "text-warning border-warning/30 bg-warning/5 shadow-warning/5",
            dotColor: "bg-warning"
          },
          offline: {
            label: "DESCONECTADO",
            color: "text-muted-foreground border-border bg-surface/20",
            dotColor: "bg-muted-foreground"
          }
        }[d.status] || {
          label: "ONLINE",
          color: "text-success border-success/30 bg-success/5",
          dotColor: "bg-success"
        };

        return (
          <div 
            key={d.id} 
            className={`glass-strong rounded-xl border border-border p-4 space-y-4 hover:border-border-strong transition-all duration-300 relative group overflow-hidden ${
              d.status === "em_rota" ? "hover:shadow-[0_4px_20px_rgba(var(--primary-rgb),0.1)]" : ""
            }`}
          >
            {/* Top Row: Avatar & Basic telemetry */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Glowing Avatar Frame */}
                <div className="relative">
                  <div className={`size-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center border border-border text-sm font-bold uppercase ${
                    d.status !== "offline" ? "shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)] animate-pulse" : ""
                  }`}>
                    {d.name.slice(0, 2)}
                  </div>
                  <span className={`absolute bottom-0 right-0 size-3 rounded-full border border-surface flex items-center justify-center ${statusConfig.dotColor}`}>
                    {d.status !== "offline" && (
                      <span className="absolute size-full rounded-full animate-ping opacity-75 bg-current" />
                    )}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-foreground leading-snug flex items-center gap-1.5">
                    {d.name}
                    {d.status !== "offline" && (
                      <span className="text-[8px] tracking-wider uppercase bg-primary/10 border border-primary/20 text-primary-glow font-mono px-1 rounded-sm">
                        LVL {Math.max(1, Math.floor(d.completedCount / 30))}
                      </span>
                    )}
                  </h3>
                  <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                    <Bike className="size-3" />
                    <span className="uppercase">{d.vehicle}</span>
                    <span>·</span>
                    <span>{d.completedCount} trips</span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider border shadow-sm ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-3 gap-2 bg-surface/30 p-2.5 rounded-lg border border-border/40 text-center font-mono">
              <div>
                <div className="text-[8px] text-muted-foreground uppercase">EFICIÊNCIA</div>
                <div className="text-xs font-bold text-foreground mt-0.5">{d.efficiency}%</div>
              </div>
              <div className="border-x border-border/40">
                <div className="text-[8px] text-muted-foreground uppercase">AVALIAÇÃO</div>
                <div className="text-xs font-bold text-foreground mt-0.5 flex items-center justify-center gap-0.5">
                  <Star className="size-2.5 fill-warning text-warning" />
                  {d.rating}
                </div>
              </div>
              <div>
                <div className="text-[8px] text-muted-foreground uppercase">MÉDIA ETA</div>
                <div className="text-xs font-bold text-foreground mt-0.5">{d.avgTime}m</div>
              </div>
            </div>

            {/* Active Delivery Status Block */}
            {d.status === "em_rota" && d.activeOrder ? (
              <div className="border border-primary/20 bg-primary/5 rounded-lg p-2.5 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 size-16 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none" />
                
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-primary-glow font-mono">ATIVIDADE: {d.activeOrder.code}</span>
                  
                  {/* Dynamic Risk badge */}
                  {d.delayRisk === "high" ? (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-danger bg-danger/10 border border-danger/25 px-1.5 py-0.5 rounded uppercase font-mono animate-pulse">
                      <ShieldAlert className="size-2.5" /> RISCO ALTO
                    </span>
                  ) : d.delayRisk === "low" ? (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-warning bg-warning/10 border border-warning/25 px-1.5 py-0.5 rounded uppercase font-mono">
                      <ShieldAlert className="size-2.5" /> ATENÇÃO
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[8px] font-bold text-success bg-success/10 border border-success/25 px-1.5 py-0.5 rounded uppercase font-mono">
                      <CheckCircle className="size-2.5" /> DENTRO DO SLA
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-foreground font-semibold truncate leading-none">
                  {d.activeOrder.customer_name}
                </div>
                <div className="text-[9px] text-muted-foreground truncate leading-none">
                  {d.activeOrder.address}
                </div>

                {/* Progress telemetry */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                    <span>Rota: {d.activeOrder.status.replace(/_/g, " ")}</span>
                    <span className="font-bold text-foreground">{d.orderElapsed}m / {d.orderSla}m</span>
                  </div>
                  <div className="h-1 bg-border/40 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        d.delayRisk === "high" ? "bg-danger" : d.delayRisk === "low" ? "bg-warning" : "bg-success"
                      }`}
                      style={{ width: `${Math.min(100, (d.orderElapsed / d.orderSla) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : d.status === "ocioso" ? (
              <div className="border border-warning/10 bg-warning/[0.02] rounded-lg p-3 text-center text-[10px] text-warning font-mono flex items-center justify-center gap-1.5">
                <Compass className="size-3.5 animate-spin" style={{ animationDuration: "6s" }} />
                REPARTIDOR OCIOSO · AGUARDANDO PRÓXIMA ROTA
              </div>
            ) : d.status === "offline" ? (
              <div className="border border-border/50 bg-surface/10 rounded-lg p-3 text-center text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                FORA DE EXPEDIENTE
              </div>
            ) : (
              <div className="border border-success/10 bg-success/[0.02] rounded-lg p-3 text-center text-[10px] text-success font-mono flex items-center justify-center gap-1.5">
                <CheckCircle className="size-3.5" />
                DISPONÍVEL NO PONTO DE COLETA
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
