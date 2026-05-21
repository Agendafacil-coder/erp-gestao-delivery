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
import { type OrderStatus } from "../lib/ops/mock";
import { DispatchService } from "../lib/services/DispatchService";
import { IaOpsService, type IaInsight } from "../lib/services/IaOpsService";
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
  updateOrderDriver: (orderId: string, driverId: string | null, status: OrderStatus) => Promise<void>;
  handleAutoDispatch: () => Promise<void>;
  handleScanLabel: (code: string) => Promise<boolean>;
  createNewOrder: (order: Omit<LocalOrder, "id" | "placed_at" | "tenant_id">) => Promise<LocalOrder>;
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
    } catch (e: any) {
      console.error("Error reading operational data:", e);
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

  // Fallback polling se SSE indisponível ou modo local
  useEffect(() => {
    if (!currentTenant?.id) return;
    if (USE_POSTGRES) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentTenant?.id, fetchData]);

  // Update single order status
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) return;
    
    try {
      const updated = await orderRepository.updateOrderStatus(orderId, status);
      
      // Adjust driver active count if order was delivered or canceled
      if ((status === "entregue" || status === "cancelado") && updated.driver_id) {
        const dMatch = driversRef.current.find(d => d.id === updated.driver_id);
        if (dMatch) {
          await driverRepository.updateDriverStatus(updated.driver_id, "disponivel");
        }
      }
      
      await fetchData();
    } catch (err: any) {
      toast.error(`Falha ao alterar status: ${err.message}`);
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
  const createNewOrder = async (order: Omit<LocalOrder, "id" | "placed_at" | "tenant_id">): Promise<LocalOrder> => {
    const tenant = currentTenantRef.current;
    if (!tenant?.id) throw new Error("No active tenant session");

    const newOrder = await orderRepository.createOrder({
      ...order,
      tenant_id: tenant.id
    });
    
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

    const pendingOrders = orders.filter(
      (o) => o.status === "pronto" || o.status === "aguardando_entregador"
    );

    const availableDrivers = drivers.filter(
      (d) =>
        (d.status === "disponivel" || d.status === "pausado" || d.status === "offline") &&
        d.active_orders === 0,
    );

    if (pendingOrders.length === 0) {
      toast.info("Não há pedidos prontos aguardando despacho.");
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
        const optimizationResults = DispatchService.calculateAutoDispatch(orders, drivers);
        
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
        const updatedDrivers = [...driversRef.current];

        for (const res of optimizationResults) {
          totalSavingsBrl += res.economyBrl;
          resultRoutes.push({
            driverName: res.driverName,
            region: res.region,
            orderCount: res.orderIds.length,
            economyBrl: res.economyBrl
          });

          // Update orders
          res.orderIds.forEach(id => {
            const idx = updatedOrders.findIndex(o => o.id === id);
            if (idx !== -1) {
              updatedOrders[idx] = {
                ...updatedOrders[idx],
                driver_id: res.driverId,
                status: "em_rota_coleta"
              };
            }
          });

          // Update driver status
          const dIdx = updatedDrivers.findIndex(d => d.id === res.driverId);
          if (dIdx !== -1) {
            updatedDrivers[dIdx] = {
              ...updatedDrivers[dIdx],
              status: "em_rota",
              active_orders: res.orderIds.length
            };
          }

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

        // Commit batch changes to repository
        await orderRepository.batchUpdateOrders(updatedOrders);
        await driverRepository.batchUpdateDrivers(updatedDrivers);
        
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

    const result = DispatchService.processTicketScan(code, orders);
    if (!result) return false;

    const { order, nextStatus } = result;
    
    // Update order status
    await orderRepository.updateOrderStatus(order.id, nextStatus);
    
    // Create operational log alert
    await alertRepository.createAlert({
      tenant_id: tenant.id,
      level: nextStatus === "entregue" ? "low" : "med",
      title: `Etiqueta Lido: ${order.code}`,
      detail: `Status avançado para ${nextStatus.replace("_", " ")} · ${order.customer_name}`,
      agoMin: 1
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
