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
import { QrCode, Plus, Printer } from "lucide-react";
import { ManualOrderDialog } from "@/components/ops/ManualOrderDialog";
import { LabelPrintDialog } from "@/components/ops/LabelPrintDialog";
import { AutoDispatchToggle } from "@/components/ops/AutoDispatchToggle";
import { IaInsightsPanel } from "@/components/ops/IaInsightsPanel";
import { DispatchOptimizationSummary } from "@/components/ops/DispatchOptimizationSummary";
import { useAutoDispatch } from "@/hooks/useAutoDispatch";
import { useAuthAccess } from "@/hooks/useAuthAccess";
import { canBatchDispatch, canMutateOps } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/central")({
  component: CentralOperacional,
});

function CentralOperacional() {
  const { current } = useTenant();
  const { t } = useI18n();
  const { role } = useAuthAccess();
  const canOperate = canMutateOps(role);
  const canDispatch = canBatchDispatch(role);
  const {
    tick,
    orders,
    drivers,
    alerts,
    iaInsights,
    isScannerOpen,
    setIsScannerOpen,
    fetchData,
    handleAutoDispatch,
    lastOptimization,
    setLastOptimization,
  } = useOps();

  const {
    enabled: autoDispatchEnabled,
    loading: autoDispatchLoading,
    saving: autoDispatchSaving,
    toggle: toggleAutoDispatch,
  } = useAutoDispatch(current?.id, fetchData);

  const [mainView, setMainView] = useState<"dashboard" | "operacao">("dashboard");
  const [activeTab, setActiveTab] = useState<"pedidos" | "entregadores">("pedidos");
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [labelPrintOpen, setLabelPrintOpen] = useState(false);
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
    if (!canOperate) return;
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
  }, [setIsScannerOpen, canOperate]);

  return (
    <>
      <OpsPage>
        <OpsPageHeader
          subtitle={t("central", "subtitle")}
          title={t("central", "title")}
          highlight={t("central", "highlight")}
          actions={
            canOperate ? (
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
                  {canDispatch ? (
                    <AutoDispatchToggle
                      enabled={autoDispatchEnabled}
                      loading={autoDispatchLoading}
                      saving={autoDispatchSaving}
                      onToggle={toggleAutoDispatch}
                      label={t("central", "dispatchBtn")}
                    />
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setLabelPrintOpen(true)}
                        className="erp-btn-secondary justify-start"
                      >
                        <Printer className="size-4 text-primary shrink-0" />
                        <span className="text-left">
                          <span className="block">Imprimir etiquetas</span>
                          <span className="block text-[11px] font-normal text-muted-foreground">
                            Cozinha e entrega
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Gera etiquetas 80mm com código, cliente, itens e endereço para colar nos pedidos.
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
            ) : undefined
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

            {lastOptimization ? (
              <DispatchOptimizationSummary
                summary={lastOptimization}
                onDismiss={() => setLastOptimization(null)}
              />
            ) : null}

            {iaInsights.length > 0 ? (
              <IaInsightsPanel
                insights={iaInsights}
                autoDispatchEnabled={autoDispatchEnabled}
                onDispatchBatch={
                  canDispatch && !autoDispatchEnabled
                    ? () => {
                        setActiveTab("entregadores");
                        void handleAutoDispatch();
                      }
                    : undefined
                }
                onEnableAutoDispatch={
                  canDispatch && !autoDispatchEnabled
                    ? () => void toggleAutoDispatch(true)
                    : undefined
                }
              />
            ) : null}

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
                  <DriversGrid
                    tick={tick}
                    drivers={scopedDrivers}
                    orders={scopedOrders}
                    showBatchDispatch={canDispatch && !autoDispatchEnabled}
                  />
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

      {canOperate ? (
        <>
          <TicketScanner
            isOpen={isScannerOpen}
            onClose={() => setIsScannerOpen(false)}
            tenantId={current?.id ?? ""}
            onScanSuccess={fetchData}
          />
          <ManualOrderDialog open={manualOrderOpen} onOpenChange={setManualOrderOpen} />
          <LabelPrintDialog
            open={labelPrintOpen}
            onOpenChange={setLabelPrintOpen}
            orders={scopedOrders}
            tenantId={current?.id ?? ""}
            storeName={current?.name ?? "Operação"}
          />
        </>
      ) : null}
    </>
  );
}
