import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useUnitView } from "@/hooks/useUnitView";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OpsPage } from "@/components/ops/OpsPage";
import { OpsPageHeader } from "@/components/ops/OpsPageHeader";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { LiveMap } from "@/components/ops/LiveMap";
import { AlertsPanel } from "@/components/ops/AlertsPanel";
import { OrdersTable } from "@/components/ops/OrdersTable";
import { DriversGrid } from "@/components/ops/DriversGrid";
import { TicketScanner } from "@/components/ops/TicketScanner";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { QrCode, Cpu, Plus } from "lucide-react";
import { DispatchReportModal } from "@/components/ops/DispatchReportModal";
import { ManualOrderDialog } from "@/components/ops/ManualOrderDialog";

export const Route = createFileRoute("/_authenticated/central")({
  component: CentralOperacional,
});

function CentralOperacional() {
  const { current } = useTenant();
  const { t } = useI18n();
  const {
    tick,
    orders,
    drivers,
    alerts,
    isScannerOpen,
    setIsScannerOpen,
    isOptimizing,
    handleAutoDispatch,
    fetchData,
    lastOptimization,
    setLastOptimization,
  } = useOps();

  const [mainView, setMainView] = useState<"dashboard" | "operacao">("dashboard");
  const [activeTab, setActiveTab] = useState<"pedidos" | "entregadores">("pedidos");
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const { filterOrders, filterDrivers, unitId, currentUnit } = useUnitView();

  const scopedOrders = useMemo(
    () => filterOrders(orders),
    [orders, filterOrders, unitId],
  );
  const scopedDrivers = useMemo(
    () => filterDrivers(scopedOrders, drivers),
    [scopedOrders, drivers, filterDrivers, unitId],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && e.key.toLowerCase() === "s") ||
        (e.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        setIsScannerOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsScannerOpen]);

  return (
    <>
      <OpsPage>
        <OpsPageHeader
          subtitle={t("central", "subtitle")}
          title={t("central", "title")}
          highlight={t("central", "highlight")}
          actions={
            <TooltipProvider delayDuration={300}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setManualOrderOpen(true)}
                      className="erp-btn-secondary justify-start"
                    >
                      <Plus className="size-4 text-primary shrink-0" />
                      <span className="text-left">
                        <span className="block">{t("central", "manualOrderBtn")}</span>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          {t("central", "manualOrderBtnHint")}
                        </span>
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Cadastra pedido de balcão ou telefone direto na operação.
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
              </div>
            </TooltipProvider>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="segmented-control w-full sm:w-auto">
            <button
              type="button"
              data-active={mainView === "dashboard"}
              className="segmented-item flex-1 sm:flex-none"
              onClick={() => setMainView("dashboard")}
            >
              Visão geral
            </button>
            <button
              type="button"
              data-active={mainView === "operacao"}
              className="segmented-item flex-1 sm:flex-none"
              onClick={() => setMainView("operacao")}
            >
              Operação ao vivo
            </button>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            Atualização · ciclo #{tick}
          </span>
        </div>

        {mainView === "dashboard" ? (
          <div key="dashboard" className="content-enter">
            <AdminDashboard
              tenantId={current?.id}
              orders={scopedOrders}
              drivers={scopedDrivers}
              alerts={alerts}
            />
          </div>
        ) : (
          <div key="operacao" className="content-enter space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <LiveMap tick={tick} drivers={scopedDrivers} orders={scopedOrders} />
              </div>
              <AlertsPanel
                tick={tick}
                orders={scopedOrders}
                drivers={scopedDrivers}
                storedAlerts={alerts}
              />
            </div>

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
              </div>

              <div key={activeTab} className="content-enter">
                {activeTab === "pedidos" ? (
                  <OrdersTable tick={tick} orders={scopedOrders} />
                ) : (
                  <DriversGrid tick={tick} drivers={scopedDrivers} orders={scopedOrders} />
                )}
              </div>
            </div>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground border-t border-border pt-4">
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
      </OpsPage>

      {lastOptimization && (
        <DispatchReportModal
          result={lastOptimization}
          totalOrders={scopedOrders.length}
          onClose={() => setLastOptimization(null)}
        />
      )}

      <TicketScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        tenantId={current?.id ?? ""}
        onScanSuccess={fetchData}
      />
      <ManualOrderDialog open={manualOrderOpen} onOpenChange={setManualOrderOpen} />
    </>
  );
}
