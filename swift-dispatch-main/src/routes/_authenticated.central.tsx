import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { KpiStrip } from "@/components/ops/KpiStrip";
import { LiveMap } from "@/components/ops/LiveMap";
import { AlertsPanel } from "@/components/ops/AlertsPanel";
import { OrdersTable } from "@/components/ops/OrdersTable";
import { Onboarding } from "@/components/ops/Onboarding";
import { TicketScanner } from "@/components/ops/TicketScanner";
import { useTenant } from "@/hooks/useTenant";
import { useOps } from "@/hooks/useOps";
import { useI18n } from "@/hooks/useI18n";
import { QrCode, Cpu, Sparkles, MapPin } from "lucide-react";

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
  } = useOps();

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

            {/* Interactive Realtime Orders List */}
            <OrdersTable tick={tick} orders={orders} />

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
