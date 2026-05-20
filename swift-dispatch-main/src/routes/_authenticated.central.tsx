import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useUnitView } from "@/hooks/useUnitView";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { QrCode, Cpu } from "lucide-react";
import { DispatchReportModal } from "@/components/ops/DispatchReportModal";

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
  const { filterOrders, filterDrivers, unitId, currentUnit } = useUnitView();

  const scopedOrders = useMemo(
    () => filterOrders(orders),
    [orders, filterOrders, unitId],
  );
  const scopedDrivers = useMemo(
    () => filterDrivers(scopedOrders, drivers),
    [scopedOrders, drivers, filterDrivers, unitId],
  );

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
                <p className="text-sm text-muted-foreground">
                  {t("central", "subtitle")}
                </p>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1">
                  {t("central", "title")}{" "}
                  <span className="text-gradient">{t("central", "highlight")}</span>
                </h1>
              </div>
              <TooltipProvider delayDuration={300}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="px-4 py-2.5 rounded-xl border border-border bg-surface/60 text-foreground hover:bg-surface-elevated/80 hover:border-primary/30 transition-all flex items-center gap-2 text-sm font-medium active:scale-[0.98]"
                      >
                        <QrCode className="size-4 text-primary-glow shrink-0" />
                        <span className="text-left">
                          <span className="block">{t("central", "scanBtn")}</span>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            Leitura de comanda ou etiqueta
                          </span>
                        </span>
                        <kbd className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 bg-background/80 border border-border rounded-md text-muted-foreground font-mono">
                          /
                        </kbd>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-popover text-popover-foreground border border-border">
                      Registra ou localiza um pedido pelo cÃ³digo da comanda. Atalhos:{" "}
                      <strong>/</strong> ou <strong>Alt+S</strong>.
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAutoDispatch}
                        disabled={isOptimizing}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_4px_24px_rgba(var(--primary-rgb),0.35)] transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-60 active:scale-[0.98]"
                      >
                        <Cpu className={`size-4 shrink-0 ${isOptimizing ? "animate-spin" : ""}`} />
                        <span className="text-left">
                          <span className="block">
                            {isOptimizing ? t("central", "calculating") : t("central", "dispatchBtn")}
                          </span>
                          <span className="block text-[11px] font-normal text-primary-foreground/85">
                            Sugere rotas e entregadores
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-popover text-popover-foreground border border-border">
                      A IA cruza pedidos abertos com entregadores disponÃ­veis e sugere alocaÃ§Ãµes
                      para reduzir atraso e distÃ¢ncia.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>

            {/* Dynamic KPIs (Computed from Live Operations Context) */}
            <KpiStrip tick={tick} orders={scopedOrders} drivers={scopedDrivers} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <LiveMap tick={tick} drivers={scopedDrivers} orders={scopedOrders} />
              </div>
              <AlertsPanel tick={tick} orders={scopedOrders} drivers={scopedDrivers} />
            </div>

            {/* Painel principal */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="segmented-control">
                  <button
                    type="button"
                    data-active={activeTab === "pedidos"}
                    className="segmented-item"
                    onClick={() => setActiveTab("pedidos")}
                  >
                    Pedidos
                  </button>
                  <button
                    type="button"
                    data-active={activeTab === "entregadores"}
                    className="segmented-item flex items-center gap-2"
                    onClick={() => setActiveTab("entregadores")}
                  >
                    Entregadores
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/15 text-primary-glow border border-primary/20">
                      {scopedDrivers.filter((d) => d.status !== "offline").length} online
                    </span>
                  </button>
                </div>
                <span className="text-xs text-muted-foreground hidden md:inline">
                  AtualizaÃ§Ã£o Â· ciclo #{tick}
                </span>
              </div>

              <div key={activeTab} className="content-enter">
                {activeTab === "pedidos" ? (
                  <OrdersTable tick={tick} orders={scopedOrders} />
                ) : (
                  <DriversGrid tick={tick} drivers={scopedDrivers} orders={scopedOrders} />
                )}
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border/50 pt-4 pb-2">
              <span>
                Delivery OS Â· <span className="text-foreground/80">{currentUnit.label}</span>
              </span>
              <span className="tabular-nums">AtualizaÃ§Ã£o Â· ciclo #{tick}</span>
              <div className="flex items-center gap-3">
                <Link
                  to="/mapa"
                  className="text-primary-glow hover:underline font-medium"
                >
                  {t("central", "footerMapLink")}
                </Link>
                <Link
                  to="/kanban"
                  className="text-primary-glow hover:underline font-medium"
                >
                  {t("central", "footerKanbanLink")}
                </Link>
              </div>
            </footer>
          </main>
        )}
      </div>
      {lastOptimization && (
        <DispatchReportModal
          result={lastOptimization}
          totalOrders={scopedOrders.length}
          onClose={() => setLastOptimization(null)}
        />
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
