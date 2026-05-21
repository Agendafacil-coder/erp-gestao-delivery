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
          <main className="flex-1 p-4 lg:p-6 space-y-5 bg-background">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="erp-page-subtitle">{t("central", "subtitle")}</p>
                <h1 className="erp-page-title mt-1">
                  {t("central", "title")} {t("central", "highlight")}
                </h1>
              </div>
              <TooltipProvider delayDuration={300}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="erp-btn-secondary justify-between sm:justify-start"
                      >
                        <QrCode className="size-4 text-primary shrink-0" />
                        <span className="text-left flex-1">
                          <span className="block">{t("central", "scanBtn")}</span>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            Comanda ou etiqueta
                          </span>
                        </span>
                        <kbd className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground font-mono">
                          /
                        </kbd>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Registra ou localiza um pedido pelo código da comanda. Atalhos:{" "}
                      <strong>/</strong> ou <strong>Alt+S</strong>.
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAutoDispatch}
                        disabled={isOptimizing}
                        className="erp-btn-primary justify-start disabled:opacity-60"
                      >
                        <Cpu className={`size-4 shrink-0 ${isOptimizing ? "animate-spin" : ""}`} />
                        <span className="text-left">
                          <span className="block">
                            {isOptimizing ? t("central", "calculating") : t("central", "dispatchBtn")}
                          </span>
                          <span className="block text-[11px] font-normal opacity-90">
                            Rotas e entregadores
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Cruza pedidos abertos com entregadores disponíveis e sugere alocações.
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
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {scopedDrivers.filter((d) => d.status !== "offline").length} online
                    </span>
                  </button>
                </div>
                <span className="text-xs text-muted-foreground hidden md:inline tabular-nums">
                  Atualização · ciclo #{tick}
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

            <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border pt-4 pb-2">
              <span>
                Delivery OS · <span className="text-foreground">{currentUnit.label}</span>
              </span>
              <span className="tabular-nums">Atualização · ciclo #{tick}</span>
              <div className="flex items-center gap-4">
                <Link to="/mapa" className="text-primary hover:underline font-medium">
                  {t("central", "footerMapLink")}
                </Link>
                <Link to="/kanban" className="text-primary hover:underline font-medium">
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
