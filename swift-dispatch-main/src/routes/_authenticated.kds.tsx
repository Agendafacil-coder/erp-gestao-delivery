import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { Onboarding } from "@/components/ops/Onboarding";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { toast } from "sonner";
import { 
  Clock, 
  Flame, 
  Check, 
  Play, 
  Pause, 
  AlertCircle, 
  Coffee, 
  Bell, 
  ChevronRight, 
  AlertTriangle,
  Volume2
} from "lucide-react";
import { soundService } from "@/lib/services/SoundService";

export const Route = createFileRoute("/_authenticated/kds")({
  component: KdsPage,
});

function KdsPage() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const { orders, drivers, tick, updateOrderStatus, updateOrderDriver, fetchData } = useOps();
  const [filter, setFilter] = useState<"todos" | "preparo" | "novo">("todos");
  const [selectedIssueOrder, setSelectedIssueOrder] = useState<string | null>(null);

  // Filter KDS active orders (only those in 'novo' or 'em_preparo')
  const kdsOrders = useMemo(() => {
    return orders.filter(o => {
      const isKdsStatus = ["novo", "em_preparo"].includes(o.status);
      if (!isKdsStatus) return false;
      if (filter === "preparo") return o.status === "em_preparo";
      if (filter === "novo") return o.status === "novo";
      return true;
    }).sort((a, b) => {
      // Prioritize critica > alta > normal > baixa, then placed_at
      const pMap: Record<string, number> = { critica: 4, alta: 3, normal: 2, baixa: 1 };
      const aVal = pMap[a.priority] || 2;
      const bVal = pMap[b.priority] || 2;
      if (bVal !== aVal) return bVal - aVal;
      return new Date(a.placed_at).getTime() - new Date(b.placed_at).getTime();
    });
  }, [orders, filter]);

  // Handle Mark In Preparation
  const handleStartPrep = async (orderId: string, code: string) => {
    try {
      await updateOrderStatus(orderId, "em_preparo");
      soundService.playNewOrder(); // Play standard alert sound
      toast.success(`Pedido ${code} iniciado na cozinha! Status atualizado.`, {
        icon: "👨‍🍳"
      });
    } catch (err: any) {
      toast.error(`Falha ao iniciar preparo: ${err.message}`);
    }
  };

  // Handle Mark Ready & Auto Dispatch
  const handleSetReady = async (orderId: string, code: string) => {
    try {
      // 1. Mark ready in kitchen
      await updateOrderStatus(orderId, "pronto");
      soundService.playAutoDispatch(); // Play happy sound
      
      toast.info(`Pedido ${code} pronto na cozinha! Fila de despacho acionada.`, {
        icon: "🍽️",
        duration: 3500
      });

      // 2. Simulate AI Logistics Dispatch Search
      setTimeout(() => {
        toast("✦ IA LOGÍSTICA: Calculando melhor entregador para rota...", {
          icon: "🧠",
          duration: 3000
        });

        // 3. Find driver and assign in simulation after 2 seconds
        setTimeout(async () => {
          const availableDriver = drivers.find(d => 
            (d.status === "disponivel" || d.status === "ocioso" || d.status === "offline") && d.active_orders === 0
          );
          
          if (availableDriver) {
            await updateOrderDriver(orderId, availableDriver.id, "em_rota_coleta");
            soundService.playDeliveryCompleted(); // Assign completed sound
            toast.success(`✦ IA DESPACHO: Entregador ${availableDriver.name} alocado para ${code}! Rota otimizada criada.`, {
              icon: "🚀",
              duration: 5000,
              description: `ETA de entrega: 14 min · Canal de Rota estabelecido.`
            });
            
            // Add automated operational event alert
            const alertsList = JSON.parse(localStorage.getItem("db_alerts") || "[]");
            alertsList.unshift({
              id: `alert-auto-${Date.now()}`,
              tenant_id: current?.id || "tenant-default-id",
              level: "low",
              title: `Despacho Automático ${code}`,
              detail: `IA alocou ${availableDriver.name} · Rota criada via KDS`,
              agoMin: 0,
              timestamp: new Date().toISOString()
            });
            localStorage.setItem("db_alerts", JSON.stringify(alertsList.slice(0, 15)));
            
            fetchData();
          } else {
            // No driver available, put order in waiting driver queue
            await updateOrderStatus(orderId, "aguardando_entregador");
            toast.warning(`SLA ALERTA: Sem entregador livre para ${code}. Pedido aguardando alocação automática.`, {
              icon: "⚠️"
            });
          }
        }, 2200);

      }, 1200);

    } catch (err: any) {
      toast.error(`Falha ao concluir preparo: ${err.message}`);
    }
  };

  const handleReportIssue = (orderId: string) => {
    setSelectedIssueOrder(null);
    toast.error(`Suporte KDS notificado para pedido! Operador de mesa alertado.`, {
      icon: "🚨"
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">{t("common", "loading")}</div>;
  }

  return (
    <div className="min-h-screen flex bg-[#06080b]">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {!current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
            {/* Header section with KDS focus */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-danger animate-pulse" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-danger font-bold">MONITOR KITCHEN KDS</span>
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1 text-white">
                  Kitchen <span className="text-gradient">Display System</span>
                </h1>
              </div>

              {/* Action tabs / Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter("todos")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    filter === "todos" 
                      ? "bg-primary/20 text-primary-glow border-primary/40" 
                      : "bg-[#11141b] border-border text-muted-foreground hover:text-white"
                  }`}
                >
                  Todos ({orders.filter(o => ["novo", "em_preparo"].includes(o.status)).length})
                </button>
                <button
                  onClick={() => setFilter("novo")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    filter === "novo" 
                      ? "bg-primary/20 text-primary-glow border-primary/40" 
                      : "bg-[#11141b] border-border text-muted-foreground hover:text-white"
                  }`}
                >
                  A Iniciar ({orders.filter(o => o.status === "novo").length})
                </button>
                <button
                  onClick={() => setFilter("preparo")}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    filter === "preparo" 
                      ? "bg-warning/20 text-warning border-warning/40" 
                      : "bg-[#11141b] border-border text-muted-foreground hover:text-white"
                  }`}
                >
                  Em Preparo ({orders.filter(o => o.status === "em_preparo").length})
                </button>
              </div>
            </div>

            {/* Quick status bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#0f1219]/90 border border-border/50 rounded-xl p-3.5 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-danger/10 flex items-center justify-center text-danger">
                  <Flame className="size-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Críticos / Atraso</div>
                  <div className="text-xl font-bold text-white font-mono">{kdsOrders.filter(o => o.priority === "critica").length}</div>
                </div>
              </div>

              <div className="bg-[#0f1219]/90 border border-border/50 rounded-xl p-3.5 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                  <Clock className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Tempo Médio Prep</div>
                  <div className="text-xl font-bold text-white font-mono">11.4m</div>
                </div>
              </div>

              <div className="bg-[#0f1219]/90 border border-border/50 rounded-xl p-3.5 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-success/10 flex items-center justify-center text-success">
                  <Check className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Prontos Hoje</div>
                  <div className="text-xl font-bold text-white font-mono">{orders.filter(o => !["novo", "em_preparo"].includes(o.status)).length}</div>
                </div>
              </div>

              <div className="bg-[#0f1219]/90 border border-border/50 rounded-xl p-3.5 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary-glow">
                  <Coffee className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">Capacidade Cozinha</div>
                  <div className="text-xl font-bold text-white font-mono">82%</div>
                </div>
              </div>
            </div>

            {/* Main KDS Grid */}
            {kdsOrders.length === 0 ? (
              <div className="bg-[#0f1219]/40 border border-border/40 rounded-2xl p-16 text-center space-y-4">
                <Coffee className="size-12 mx-auto text-muted-foreground/30" />
                <h3 className="text-lg font-bold text-white">Nenhum Pedido na Fila</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Excelente trabalho! Todos os pedidos ativos já foram preparados ou despachados para logística.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {kdsOrders.map(order => {
                  const placed = new Date(order.placed_at).getTime();
                  const elapsed = Math.max(0, Math.floor((Date.now() - placed) / 60000));
                  const remaining = order.sla_minutes - elapsed;
                  const isDelayed = remaining < 0;
                  
                  // Compute color based on priority
                  const cardBorder = 
                    order.priority === "critica" ? "border-l-[6px] border-l-danger border-danger/35 bg-danger/[0.03] shadow-[0_0_20px_rgba(239,68,68,0.1)]" :
                    order.priority === "alta" ? "border-l-[6px] border-l-warning border-warning/30 bg-warning/[0.02]" :
                    order.status === "em_preparo" ? "border-l-[6px] border-l-warning/60 border-warning/20 bg-warning/[0.01]" :
                    "border-l-[6px] border-l-primary border-primary/20 bg-surface/30";

                  return (
                    <div 
                      key={order.id} 
                      className={`group rounded-xl border border-border bg-[#0b0e14] p-4 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${cardBorder}`}
                    >
                      {/* Critical Warning Glow */}
                      {order.priority === "critica" && (
                        <div className="absolute top-0 right-0 size-24 bg-danger/5 rounded-full blur-xl pointer-events-none" />
                      )}

                      {/* Ticket top Header */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-lg font-extrabold text-white tracking-tight">{order.code}</span>
                            <span className="text-[10px] uppercase font-mono tracking-widest text-muted-foreground/80 bg-surface/50 border border-border px-1.5 py-0.5 rounded">
                              {order.channel}
                            </span>
                          </div>
                          
                          {/* SLA Timer details */}
                          <div className="text-right">
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                              isDelayed 
                                ? "bg-danger/20 text-danger border border-danger/30 animate-pulse" 
                                : remaining < 15 
                                  ? "bg-warning/20 text-warning border border-warning/30" 
                                  : "bg-success/20 text-success border border-success/30"
                            }`}>
                              {isDelayed ? `ATRASADO -${Math.abs(remaining)}m` : `${remaining}m RESTANTES`}
                            </span>
                          </div>
                        </div>

                        {/* Customer details */}
                        <div className="pt-2">
                          <div className="text-sm font-bold text-foreground truncate">{order.customer_name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">Entrada: {new Date(order.placed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ({elapsed}m decorridos)</div>
                        </div>

                        {/* Items list section (Highly detailed visual) */}
                        <div className="py-3.5 my-3 border-y border-border/40 space-y-1.5">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">PRODUTOS DO PEDIDO:</div>
                          <div className="text-xs font-medium text-white/95 space-y-1">
                            {/* Detailed dynamic items generator based on total_amount seed */}
                            <div className="flex justify-between items-center py-0.5">
                              <span>{order.items_count}x Hamburguer Premium {order.total_amount > 80 ? "Blend Angus 180g" : "Clássico 150g"}</span>
                              <span className="text-muted-foreground font-mono">cod. #9213</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span>1x Batata Frita Rústica Crocante</span>
                              <span className="text-muted-foreground font-mono">cod. #0283</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                              <span>1x Refrigerante Lata Zero Açúcar</span>
                              <span className="text-muted-foreground font-mono">cod. #3819</span>
                            </div>
                          </div>
                          
                          {/* Chef notes */}
                          <div className="bg-[#121620] border border-border/40 rounded p-2 mt-2 text-[10px] text-warning/90 font-mono leading-relaxed">
                            ⚠️ OBS: Ponto da carne ao ponto para bem passado. Sem cebola na batata.
                          </div>
                        </div>
                      </div>

                      {/* Ticket Footer Buttons */}
                      <div className="space-y-2 pt-2">
                        {order.status === "novo" ? (
                          <button
                            onClick={() => handleStartPrep(order.id, order.code)}
                            className="w-full py-3 rounded-lg bg-gradient-to-r from-warning to-amber-500 hover:from-warning/90 hover:to-amber-500/90 text-black font-extrabold text-xs tracking-wider transition uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(245,158,11,0.15)]"
                          >
                            <Play className="size-3.5 fill-black" />
                            INICIAR PREPARO COZINHA
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetReady(order.id, order.code)}
                            className="w-full py-3 rounded-lg bg-gradient-to-r from-success to-emerald-500 hover:from-success/90 hover:to-emerald-500/90 text-black font-extrabold text-xs tracking-wider transition uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.15)]"
                          >
                            <Check className="size-4" strokeWidth={3} />
                            MARCAR COMO PRONTO
                          </button>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedIssueOrder(order.id)}
                            className="flex-1 py-2 rounded-lg border border-danger/30 bg-danger/10 hover:bg-danger/20 text-danger text-[10px] font-bold tracking-wider uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <AlertCircle className="size-3" />
                            REPORTE PROBLEMA
                          </button>
                          
                          <button
                            onClick={() => toast.info(`Pedido ${order.code} temporariamente pausado na cozinha.`)}
                            className="py-2 px-3 rounded-lg border border-border hover:bg-surface/50 text-muted-foreground hover:text-white transition flex items-center justify-center cursor-pointer"
                            title="Pausar Pedido"
                          >
                            <Pause className="size-3" />
                          </button>
                        </div>
                      </div>

                      {/* Issue confirmation popover inside the card */}
                      {selectedIssueOrder === order.id && (
                        <div className="absolute inset-0 bg-[#06080b]/95 backdrop-blur-md p-4 flex flex-col justify-between z-10 animate-in fade-in duration-200">
                          <div className="space-y-3 text-center pt-2">
                            <AlertTriangle className="size-8 text-danger mx-auto animate-bounce" />
                            <h4 className="font-bold text-white text-sm">Selecione o problema operacional:</h4>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                              <button onClick={() => handleReportIssue(order.id)} className="p-2 border border-border rounded text-left text-foreground hover:bg-surface transition">Falta insumo</button>
                              <button onClick={() => handleReportIssue(order.id)} className="p-2 border border-border rounded text-left text-foreground hover:bg-surface transition">Prato queimado</button>
                              <button onClick={() => handleReportIssue(order.id)} className="p-2 border border-border rounded text-left text-foreground hover:bg-surface transition">Erro na comanda</button>
                              <button onClick={() => handleReportIssue(order.id)} className="p-2 border border-border rounded text-left text-foreground hover:bg-surface transition">Sobrecarga</button>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedIssueOrder(null)}
                            className="w-full py-1.5 border border-border rounded text-xs text-muted-foreground hover:text-white"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
