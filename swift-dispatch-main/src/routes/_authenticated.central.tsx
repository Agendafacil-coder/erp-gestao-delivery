import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { KpiStrip } from "@/components/ops/KpiStrip";
import { LiveMap } from "@/components/ops/LiveMap";
import { AlertsPanel } from "@/components/ops/AlertsPanel";
import { OrdersTable } from "@/components/ops/OrdersTable";
import { DriversGrid } from "@/components/ops/DriversGrid";
import { Onboarding } from "@/components/ops/Onboarding";
import { TicketScanner } from "@/components/ops/TicketScanner";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { QrCode, Cpu, Sparkles, MapPin, Bike } from "lucide-react";

export const Route = createFileRoute("/_authenticated/central")({
  component: CentralOperacional,
});

function CentralOperacional() {
  const { current, loading } = useTenant();
  const { t } = useI18n();
  const {
    tick,
    orders,
    drivers,
    isScannerOpen,
    setIsScannerOpen,
    isOptimizing,
    handleAutoDispatch,
    fetchData,
    lastOptimization,
    setLastOptimization,
  } = useOps();

  const [activeTab, setActiveTab] = useState<"pedidos" | "entregadores">("pedidos");

  // Hotkey listener: Pressing Alt+S or '/' anywhere on the screen opens scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === "s") || (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")) {
        e.preventDefault();
        setIsScannerOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsScannerOpen]);

  return (
    <div className="min-h-screen flex">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t("common", "loading")}
          </div>
        ) : !current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 p-4 lg:p-6 space-y-6">
            {/* Header Title with Custom Actions */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {t("central", "subtitle")}
                </div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1">
                  {t("central", "title")}{" "}
                  <span className="text-gradient">{t("central", "highlight")}</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {/* Scan Receipt Tag Button */}
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-2 rounded-lg border border-primary/20 bg-primary/10 text-primary-glow hover:bg-primary/20 transition flex items-center gap-1.5 font-medium relative group"
                  title="Alt+S ou '/' para abrir"
                >
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                  </span>
                  <QrCode className="size-3.5" /> 
                  {t("central", "scanBtn")}
                  <kbd className="hidden sm:inline-flex ml-1 text-[9px] px-1 bg-surface border border-border rounded text-muted-foreground font-mono">/</kbd>
                </button>

                {/* Auto Dispatch AI Button */}
                <button 
                  onClick={handleAutoDispatch}
                  disabled={isOptimizing}
                  className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-95 transition flex items-center gap-1.5 font-medium disabled:opacity-60 cursor-pointer"
                >
                  <Cpu className={`size-3.5 ${isOptimizing ? "animate-spin" : ""}`} /> 
                  {isOptimizing ? t("central", "calculating") : t("central", "dispatchBtn")}
                </button>
              </div>
            </div>

            {/* Dynamic KPIs (Computed from Live Operations Context) */}
            <KpiStrip tick={tick} orders={orders} drivers={drivers} />

            {/* Map and Active Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <LiveMap tick={tick} drivers={drivers} orders={orders} />
              </div>
              <AlertsPanel tick={tick} orders={orders} drivers={drivers} />
            </div>

            {/* Dual-Tab Interactive Control Cockpit */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-6">
                  {/* Tab 1: Orders */}
                  <button 
                    onClick={() => setActiveTab("pedidos")}
                    className={`pb-2 text-xs font-bold tracking-widest uppercase transition cursor-pointer relative ${
                      activeTab === "pedidos" ? "text-primary-glow font-extrabold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>MONITORAMENTO DE PEDIDOS</span>
                    {activeTab === "pedidos" && (
                      <span className="absolute bottom-[-9px] inset-x-0 h-[2.5px] bg-primary rounded-t-full shadow-glow" />
                    )}
                  </button>

                  {/* Tab 2: Drivers Grid */}
                  <button 
                    onClick={() => setActiveTab("entregadores")}
                    className={`pb-2 text-xs font-bold tracking-widest uppercase transition cursor-pointer relative ${
                      activeTab === "entregadores" ? "text-primary-glow font-extrabold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      PERFORMANCE DE ENTREGADORES
                      <span className="text-[9px] bg-primary/10 text-primary-glow border border-primary/20 px-1.5 py-0.2 rounded-full font-mono font-bold">
                        {drivers.filter(d => d.status !== "offline").length} LIVE
                      </span>
                    </span>
                    {activeTab === "entregadores" && (
                      <span className="absolute bottom-[-9px] inset-x-0 h-[2.5px] bg-primary rounded-t-full shadow-glow" />
                    )}
                  </button>
                </div>

                <div className="text-[10px] text-muted-foreground font-mono hidden md:inline uppercase tracking-widest">
                  TICK SIMULAÇÃO: #{tick}
                </div>
              </div>

              {activeTab === "pedidos" ? (
                <OrdersTable tick={tick} orders={orders} />
              ) : (
                <DriversGrid tick={tick} />
              )}
            </div>

            <footer className="text-[10px] text-muted-foreground/70 uppercase tracking-widest text-center pb-4 flex items-center justify-center gap-3">
              <span>Delivery OS · Enterprise Central</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Sparkles className="size-2.5 text-primary-glow animate-pulse" />{" "}
                {t("central", "iaActive")}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-2.5 text-success" />{" "}
                {orders.filter((o) => o.status !== "entregue" && o.status !== "cancelado").length}{" "}
                {t("central", "activeOrders").toLowerCase()}
              </span>
            </footer>
          </main>
        )}
      </div>

      {/* Futuristic IA Auto-Dispatch Optimization overlay */}
      {lastOptimization && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="glass-strong border border-primary/30 rounded-2xl p-6 max-w-xl w-full shadow-[0_0_50px_rgba(var(--primary-rgb),0.25)] relative overflow-hidden space-y-6 animate-in fade-in zoom-in duration-300">
            
            {/* Cyberpunk glow divider */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary-glow to-transparent animate-pulse" />
            <div className="absolute -top-16 -right-16 size-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-glow animate-bounce">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground tracking-wider">RELATÓRIO DE DESPACHO INTELIGENTE</h3>
                  <p className="text-[9px] text-muted-foreground font-mono leading-none mt-0.5">IA ENGINE V4.2 · EFICIÊNCIA ROTEAMENTO</p>
                </div>
              </div>
              
              <button 
                onClick={() => setLastOptimization(null)}
                className="text-muted-foreground hover:text-foreground text-[10px] font-mono border border-border bg-surface/50 hover:bg-surface px-2.5 py-1 rounded transition cursor-pointer"
              >
                [ FECHAR RELATÓRIO ]
              </button>
            </div>

            {/* Savings HUD Strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-success/[0.04] border border-success/20 rounded-xl p-3 text-center">
                <div className="text-[8px] text-success/75 font-mono uppercase font-bold tracking-wider">ECONOMIA ESTIMADA</div>
                <div className="text-xl font-bold font-mono text-success mt-1">R$ {lastOptimization.totalSavingsBrl.toFixed(2)}</div>
                <div className="text-[8px] text-success/50 font-mono mt-0.5 uppercase">Custos reduzidos</div>
              </div>
              
              <div className="bg-primary/[0.04] border border-primary/20 rounded-xl p-3 text-center">
                <div className="text-[8px] text-primary-glow/75 font-mono uppercase font-bold tracking-wider">TEMPO SALVO</div>
                <div className="text-xl font-bold font-mono text-primary-glow mt-1">+{lastOptimization.timeSavedMinutes} MIN</div>
                <div className="text-[8px] text-primary-glow/50 font-mono mt-0.5 uppercase">SLA otimizado</div>
              </div>

              <div className="bg-accent/[0.04] border border-accent/20 rounded-xl p-3 text-center">
                <div className="text-[8px] text-accent/75 font-mono uppercase font-bold tracking-wider">ROTAS REDUZIDAS</div>
                <div className="text-xl font-bold font-mono text-accent mt-1">-{lastOptimization.kmReduced} KM</div>
                <div className="text-[8px] text-accent/50 font-mono mt-0.5 uppercase">Menor pegada</div>
              </div>
            </div>

            {/* Optimized Routes List */}
            <div className="space-y-2.5">
              <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider font-bold">ROTAS E BATELADAS ALOCADAS ({lastOptimization.totalRoutes})</div>
              
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {lastOptimization.routes.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-surface/40 border border-border/60 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <Bike className="size-3.5 text-primary-glow" />
                      <div>
                        <span className="font-bold text-foreground/90">{r.driverName}</span>
                        <span className="text-muted-foreground text-[9px] ml-1.5 uppercase font-semibold">({r.region})</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-foreground/90">{r.orderCount} Pedidos</div>
                      <div className="text-[9px] text-success/80 font-bold">-R$ {r.economyBrl.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom telemetry quote */}
            <div className="text-[8px] text-muted-foreground/60 text-center font-mono uppercase border-t border-border/30 pt-4">
              ALGORITMO COMPLETO EM 1.2s · TAXA DE ALOCAÇÃO IA +{((lastOptimization.assignedOrders / (orders.length || 1)) * 100).toFixed(0)}%
            </div>

          </div>
        </div>
      )}

      {/* Futuristic Receipt Scanner Overlay Panel */}
      <TicketScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        tenantId={current?.id ?? ""} 
        onScanSuccess={fetchData} 
      />
    </div>
  );
}
