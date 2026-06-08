import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useOpsStream } from "./useOpsStream";
import { 
  orderRepository, 
  driverRepository, 
  alertRepository, 
  LocalOrder, 
  LocalDriver, 
  LocalAlert,
  localDb,
  USE_POSTGRES,
} from "../lib/repositories";
import type { OrderAction, OrderStatus } from "@/lib/ops/orderWorkflow";
import { assertValidTransition, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import type { CreateOrderExtras } from "@/functions/orders";
import { processSlaWhatsappAlertsFn } from "@/functions/whatsapp";
import { pollIfoodEventsFn } from "@/functions/ifood";
import { DispatchService } from "../lib/services/DispatchService";
import { IaOpsService, type IaInsight } from "../lib/services/IaOpsService";
import { needsDispatch } from "../lib/ops/orderWorkflow";
import { useTenant } from "./useTenant";
import { toast } from "sonner";
import { soundService } from "../lib/services/SoundService";

export interface LastOptimizationSummary {
  assignedOrders: number;
  totalRoutes: number;
  totalSavingsBrl: number;
  timeSavedMinutes: number;
  kmReduced: number;
  routes: Array<{
    driverName: string;
    region: string;
    orderCount: number;
    economyBrl: number;
  }>;
}

interface OpsCtx {
  tick: number;
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
  iaInsights: IaInsight[];
  isOptimizing: boolean;
  isScannerOpen: boolean;
  setIsScannerOpen: (open: boolean) => void;
  lastOptimization: LastOptimizationSummary | null;
  setLastOptimization: (val: LastOptimizationSummary | null) => void;
  fetchData: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  applyOrderAction: (orderId: string, action: OrderAction, driverId?: string | null) => Promise<void>;
  updateOrderDriver: (orderId: string, driverId: string | null, status: OrderStatus) => Promise<void>;
  handleAutoDispatch: () => Promise<void>;
  handleScanLabel: (code: string) => Promise<boolean>;
  createNewOrder: (
    order: Omit<LocalOrder, "id" | "placed_at" | "tenant_id">,
    extras?: CreateOrderExtras,
  ) => Promise<LocalOrder>;
}

const Ctx = createContext<OpsCtx | null>(null);

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const { current: currentTenant } = useTenant();
  const [tick, setTick] = useState(0);
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [drivers, setDrivers] = useState<LocalDriver[]>([]);
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [iaInsights, setIaInsights] = useState<IaInsight[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<LastOptimizationSummary | null>(null);

  // References for async handlers
  const ordersRef = useRef<LocalOrder[]>([]);
  const driversRef = useRef<LocalDriver[]>([]);
  const currentTenantRef = useRef<any>(null);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    driversRef.current = drivers;
  }, [drivers]);

  useEffect(() => {
    currentTenantRef.current = currentTenant;
  }, [currentTenant]);

  const fetchData = useCallback(async () => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) return;
    
    try {
      const [oList, dList, aList] = await Promise.all([
        orderRepository.listOrders(tenant.id),
        driverRepository.listDrivers(tenant.id),
        alertRepository.listAlerts(tenant.id)
      ]);
      
      setOrders(oList);
      setDrivers(dList);
      setAlerts(aList);
      
      // Calculate AI Insights
      const insights = IaOpsService.generateDiagnostics(oList, dList);
      setIaInsights(insights);
    } catch (e: unknown) {
      console.error("Error reading operational data:", e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("muitos clientes") || msg.includes("53300") || msg.includes("DATABASE_URL")) {
        toast.error(msg, { duration: 8000 });
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!USE_POSTGRES) {
      localDb.initDb();
    }

    if (currentTenant?.id) {
      fetchData();
    }
  }, [currentTenant?.id, fetchData]);

  const applyStreamSnapshot = useCallback(
    (snap: {
      orders: LocalOrder[];
      drivers: LocalDriver[];
      alerts: LocalAlert[];
      iaInsights: IaInsight[];
    }) => {
      setOrders(snap.orders);
      setDrivers(snap.drivers);
      setAlerts(snap.alerts);
      setIaInsights(snap.iaInsights);
      setTick((t) => t + 1);
    },
    [],
  );

  useOpsStream(currentTenant?.id, applyStreamSnapshot);

  // Polling: modo local a cada 5s; Postgres usa SSE + fallback a cada 15s
  useEffect(() => {
    if (!currentTenant?.id) return;

    const intervalMs = USE_POSTGRES ? 15000 : 5000;
    const interval = setInterval(() => {
      if (!USE_POSTGRES) setTick((t) => t + 1);
      void fetchData();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [currentTenant?.id, fetchData]);

  // Alertas SLA → WhatsApp gerente (Postgres, a cada 60s)
  useEffect(() => {
    if (!USE_POSTGRES || !currentTenant?.id) return;
    const tenantId = currentTenant.id;
    const run = () => {
      void processSlaWhatsappAlertsFn({ data: { tenantId } }).catch(() => {});
    };
    run();
    const timer = setInterval(run, 60000);
    return () => clearInterval(timer);
  }, [currentTenant?.id]);

  // Polling iFood Events API (Postgres + OAuth, a cada 30s)
  useEffect(() => {
    if (!USE_POSTGRES || !currentTenant?.id) return;
    const tenantId = currentTenant.id;
    const run = () => {
      void pollIfoodEventsFn({ data: { tenantId } })
        .then((result) => {
          if (result.error) return;
          if (result.events_processed > 0) void fetchData();
        })
        .catch(() => {});
    };
    run();
    const timer = setInterval(run, 30000);
    return () => clearInterval(timer);
  }, [currentTenant?.id, fetchData]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) return;

    const order = ordersRef.current.find((o) => o.id === orderId);
    if (order) {
      assertValidTransition(normalizeOrderStatus(order.status), normalizeOrderStatus(status));
    }

    try {
      await orderRepository.updateOrderStatus(orderId, status);
      await fetchData();
    } catch (err: unknown) {
      toast.error(`Falha ao alterar status: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const applyOrderAction = async (
    orderId: string,
    action: OrderAction,
    driverId?: string | null,
  ) => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) return;

    try {
      await orderRepository.applyOrderAction(orderId, action, driverId);
      await fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
      throw err;
    }
  };

  // Update order driver assignment
  const updateOrderDriver = async (orderId: string, driverId: string | null, status: OrderStatus) => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) return;
    
    try {
      await orderRepository.updateOrderDriver(orderId, driverId, status);
      if (driverId) {
        await driverRepository.updateDriverStatus(driverId, "em_rota");
      }
      await fetchData();
    } catch (err: any) {
      toast.error(`Falha ao alocar entregador: ${err.message}`);
    }
  };

  // Create new order manually (or via scanner)
  const createNewOrder = async (
    order: Omit<LocalOrder, "id" | "placed_at" | "tenant_id">,
    extras?: CreateOrderExtras,
  ): Promise<LocalOrder> => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) throw new Error("No active tenant session");

    const newOrder = await orderRepository.createOrder(
      {
        ...order,
        tenant_id: tenant.id,
      },
      extras,
    );
    
    await fetchData();
    return newOrder;
  };

  // Auto Dispatch Engine calculate triggers
  const handleAutoDispatch = async () => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) return;

    if (orders.length === 0 || drivers.length === 0) {
      toast.warning("Dados operacionais insuficientes.");
      return;
    }

    const pendingOrders = orders.filter((o) => needsDispatch(o.status));

    const availableDrivers = drivers.filter(
      (d) => d.status === "disponivel" && d.active_orders === 0,
    );

    if (pendingOrders.length === 0) {
      toast.info("Não há pedidos aguardando despacho.");
      return;
    }

    if (availableDrivers.length === 0) {
      toast.error("Alerta IA: Todos os entregadores estão ocupados ou offline!");
      return;
    }

    setIsOptimizing(true);
    const toastId = toast.loading("Calculando rotas otimizadas e agrupando entregas...");

    setTimeout(async () => {
      try {
        const optimizationResults = DispatchService.calculateAutoDispatch(
          ordersRef.current,
          driversRef.current,
        );
        
        if (optimizationResults.length === 0) {
          toast.info("Não foi possível otimizar as entregas com as regras atuais.");
          setIsOptimizing(false);
          toast.dismiss(toastId);
          return;
        }

        let assignedCount = 0;
        let routeCount = 0;
        let totalSavingsBrl = 0;
        const resultRoutes: Array<{ driverName: string; region: string; orderCount: number; economyBrl: number }> = [];

        const updatedOrders = [...ordersRef.current];

        for (const res of optimizationResults) {
          totalSavingsBrl += res.economyBrl;
          resultRoutes.push({
            driverName: res.driverName,
            region: res.region,
            orderCount: res.orderIds.length,
            economyBrl: res.economyBrl
          });

          res.orderIds.forEach(id => {
            const idx = updatedOrders.findIndex(o => o.id === id);
            if (idx !== -1) {
              updatedOrders[idx] = {
                ...updatedOrders[idx],
                driver_id: res.driverId,
                status: "aguardando_entregador"
              };
            }
          });

          assignedCount += res.orderIds.length;
          routeCount++;

          toast.success(
            `IA Rota Otimizada! ${res.orderIds.length} entregas em ${res.region} agrupadas para ${res.driverName}. Economia de R$ ${res.economyBrl.toFixed(2)}!`
          );
        }

        const timeSavedMinutes = assignedCount * 12;
        const kmReduced = parseFloat((assignedCount * 3.2).toFixed(1));

        setLastOptimization({
          assignedOrders: assignedCount,
          totalRoutes: routeCount,
          totalSavingsBrl,
          timeSavedMinutes,
          kmReduced,
          routes: resultRoutes
        });

        // Commit batch changes to repository (somente pedidos alterados)
        const changedOrders = updatedOrders.filter((o) => {
          const orig = ordersRef.current.find((x) => x.id === o.id);
          return (
            orig &&
            (orig.driver_id !== o.driver_id || normalizeOrderStatus(orig.status) !== normalizeOrderStatus(o.status))
          );
        });
        await orderRepository.batchUpdateOrders(changedOrders);
        
        setIsOptimizing(false);
        toast.dismiss(toastId);
        
        soundService.playAutoDispatch();
        toast.success(`Despacho inteligente completo: ${assignedCount} pedidos despachados em ${routeCount} rotas!`);
        fetchData();
      } catch (err: any) {
        setIsOptimizing(false);
        toast.dismiss(toastId);
        toast.error(`Falha no despacho automático: ${err.message}`);
      }
    }, 1200);
  };

  // Process label scans
  const handleScanLabel = async (code: string): Promise<boolean> => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) return false;

    const result = DispatchService.processTicketScan(code, ordersRef.current);
    if (!result) return false;

    const { order } = result;

    if (result.kind === "retirei") {
      await orderRepository.applyOrderAction(order.id, "retirei_pedido");
    } else if (result.nextStatus === "em_rota_entrega") {
      await orderRepository.applyOrderAction(order.id, "saiu_entrega");
    } else {
      await orderRepository.updateOrderStatus(order.id, result.nextStatus);
    }
    
    // Create operational log alert
    const statusLabel =
      result.kind === "retirei"
        ? "retirada no restaurante"
        : result.nextStatus.replace(/_/g, " ");
    await alertRepository.createAlert({
      tenant_id: tenant.id,
      level: result.kind === "status" && result.nextStatus === "entregue" ? "low" : "med",
      title: `Etiqueta lida: ${order.code}`,
      detail: `Avançado para ${statusLabel} · ${order.customer_name}`,
      agoMin: 1,
    });

    await fetchData();
    return true;
  };

  return (
    <Ctx.Provider
      value={{
        tick,
        orders,
        drivers,
        alerts,
        iaInsights,
        isOptimizing,
        isScannerOpen,
        setIsScannerOpen,
        lastOptimization,
        setLastOptimization,
        fetchData,
        updateOrderStatus,
        applyOrderAction,
        updateOrderDriver,
        handleAutoDispatch,
        handleScanLabel,
        createNewOrder
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useOps = () => {
  const context = useContext(Ctx);
  if (!context) {
    throw new Error("useOps must be used within an OpsProvider");
  }
  return context;
};
