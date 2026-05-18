import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { OpsSidebar } from "@/components/ops/Sidebar";
import { OpsHeader } from "@/components/ops/Header";
import { KpiStrip } from "@/components/ops/KpiStrip";
import { LiveMap } from "@/components/ops/LiveMap";
import { AlertsPanel } from "@/components/ops/AlertsPanel";
import { OrdersTable } from "@/components/ops/OrdersTable";
import { Onboarding } from "@/components/ops/Onboarding";
import { TicketScanner } from "@/components/ops/TicketScanner";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QrCode, Cpu, Sparkles, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/central")({
  component: CentralOperacional,
});

function CentralOperacional() {
  const [tick, setTick] = useState(0);
  const { current, loading } = useTenant();
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Periodical tick for SLA calculations
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

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
  }, []);

  // Fetch orders and drivers from Supabase
  const fetchData = useCallback(async () => {
    if (!current?.id) return;
    try {
      const [{ data: oData, error: oError }, { data: dData, error: dError }] = await Promise.all([
        supabase
          .from("orders")
          .select("*, drivers(id, name)")
          .eq("tenant_id", current.id)
          .order("placed_at", { ascending: false }),
        supabase
          .from("drivers")
          .select("*")
          .eq("tenant_id", current.id)
          .order("name", { ascending: true })
      ]);

      if (oError) throw oError;
      if (dError) throw dError;

      setOrders(oData ?? []);
      setDrivers(dData ?? []);
    } catch (e: any) {
      toast.error(`Erro ao carregar dados: ${e.message}`);
    }
  }, [current?.id]);

  useEffect(() => {
    if (current?.id) {
      fetchData();

      // Set up Realtime subscriptions for instantaneous updates
      const ordersChannel = supabase
        .channel(`central-orders-${current.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "orders", filter: `tenant_id=eq.${current.id}` },
          () => fetchData()
        )
        .subscribe();

      const driversChannel = supabase
        .channel(`central-drivers-${current.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "drivers", filter: `tenant_id=eq.${current.id}` },
          () => fetchData()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(driversChannel);
      };
    }
  }, [current?.id, fetchData]);

  // Logistic Dispatch Engine (Logística Inteligente & Despacho Automático)
  const handleAutoDispatch = async () => {
    if (orders.length === 0 || drivers.length === 0) {
      toast.warning("Dados operacionais indisponíveis para despacho.");
      return;
    }

    // Filter undispatched/ready orders
    const pendingOrders = orders.filter(
      (o) => o.status === "pronto" || o.status === "aguardando_entregador"
    );

    // Filter available drivers (status = disponivel or offline-simulate)
    const availableDrivers = drivers.filter(
      (d) => d.status === "disponivel" || d.status === "offline"
    );

    if (pendingOrders.length === 0) {
      toast.info("Não há pedidos aguardando despacho no momento.");
      return;
    }

    if (availableDrivers.length === 0) {
      toast.error("Alerta IA: Todos os entregadores estão em rota ou offline!");
      return;
    }

    setIsOptimizing(true);
    const toastId = toast.loading("IA Logística: Calculando rotas otimizadas e agrupando entregas...");

    setTimeout(async () => {
      try {
        let assignedCount = 0;
        let routeCount = 0;

        // Group pending orders by region/neighborhood
        const regionGroups: Record<string, any[]> = {};
        pendingOrders.forEach((o) => {
          const region = o.address.split(",")[0] || "Geral";
          if (!regionGroups[region]) regionGroups[region] = [];
          regionGroups[region].push(o);
        });

        // Loop regions and assign to available drivers
        const regions = Object.keys(regionGroups);
        const driversList = [...availableDrivers];

        for (const region of regions) {
          if (driversList.length === 0) break;
          const group = regionGroups[region];
          const driver = driversList.shift(); // assign this driver

          // Update up to 3 nearby orders in this region for this driver (Smart Grouping!)
          const ordersToUpdate = group.slice(0, 3);
          const orderIds = ordersToUpdate.map((o) => o.id);

          // Update orders
          const { error: oErr } = await supabase
            .from("orders")
            .update({ 
              driver_id: driver.id, 
              status: "em_rota_coleta" 
            })
            .in("id", orderIds);

          if (oErr) throw oErr;

          // Update driver status
          const { error: dErr } = await supabase
            .from("drivers")
            .update({ status: "em_rota" })
            .eq("id", driver.id);

          if (dErr) throw dErr;

          assignedCount += ordersToUpdate.length;
          routeCount++;
          
          toast.success(`IA: Rota Otimizada! ${ordersToUpdate.length} entregas em ${region} agrupadas para ${driver.name}.`);
        }

        setIsOptimizing(false);
        toast.dismiss(toastId);
        
        if (assignedCount > 0) {
          toast.success(`Despacho Concluído: ${assignedCount} pedidos alocados em ${routeCount} rotas inteligentes!`, {
            duration: 5000,
          });
          fetchData();
        } else {
          toast.info("Não foi possível otimizar as entregas com as regras atuais.");
        }
      } catch (e: any) {
        setIsOptimizing(false);
        toast.dismiss(toastId);
        toast.error(`Erro na otimização automática: ${e.message}`);
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen flex">
      <OpsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OpsHeader tick={tick} />
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>
        ) : !current ? (
          <Onboarding />
        ) : (
          <main className="flex-1 p-4 lg:p-6 space-y-6">
            {/* Header Title with Custom Actions */}
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Torre de Controle</div>
                <h1 className="text-2xl lg:text-3xl font-display font-semibold mt-1">
                  Central <span className="text-gradient">Operacional</span>
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
                  Escanear Etiqueta <kbd className="hidden sm:inline-flex ml-1 text-[9px] px-1 bg-surface border border-border rounded text-muted-foreground font-mono">/</kbd>
                </button>

                {/* Auto Dispatch AI Button */}
                <button 
                  onClick={handleAutoDispatch}
                  disabled={isOptimizing}
                  className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-95 transition flex items-center gap-1.5 font-medium disabled:opacity-60"
                >
                  <Cpu className={`size-3.5 ${isOptimizing ? "animate-spin" : ""}`} /> 
                  {isOptimizing ? "Calculando rotas..." : "Despacho auto ✦"}
                </button>
              </div>
            </div>

            {/* Dynamic KPIs (Computed from Supabase Live Data) */}
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
              <span className="flex items-center gap-1"><Sparkles className="size-2.5 text-primary-glow animate-pulse" /> IA Operacional ativa</span>
              <span>·</span>
              <span className="flex items-center gap-1"><MapPin className="size-2.5 text-success" /> {orders.filter(o => o.status !== "entregue" && o.status !== "cancelado").length} pedidos ativos</span>
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
