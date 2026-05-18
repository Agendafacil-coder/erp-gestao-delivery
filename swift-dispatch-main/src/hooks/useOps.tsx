import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { 
  orderRepository, 
  driverRepository, 
  alertRepository, 
  tenantRepository, 
  LocalOrder, 
  LocalDriver, 
  LocalAlert,
  localDb
} from "../lib/repositories";
import { type OrderStatus } from "../lib/ops/mock";
import { DispatchService } from "../lib/services/DispatchService";
import { IaOpsService, type IaInsight } from "../lib/services/IaOpsService";
import { useTenant } from "./useTenant";
import { toast } from "sonner";

interface OpsCtx {
  tick: number;
  orders: LocalOrder[];
  drivers: LocalDriver[];
  alerts: LocalAlert[];
  iaInsights: IaInsight[];
  isOptimizing: boolean;
  isScannerOpen: boolean;
  setIsScannerOpen: (open: boolean) => void;
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

  // References to keep callbacks and simulators updated
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
    // Make sure DB has seeds if empty
    localDb.initDb();
    
    if (currentTenant?.id) {
      fetchData();
    }
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
      (d) => (d.status === "disponivel" || d.status === "ocioso" || d.status === "offline") && d.active_orders === 0
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

    // Simulate server route optimizing delay
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

        const updatedOrders = [...ordersRef.current];
        const updatedDrivers = [...driversRef.current];

        for (const res of optimizationResults) {
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

        // Commit batch changes to repository
        await orderRepository.batchUpdateOrders(updatedOrders);
        await driverRepository.batchUpdateDrivers(updatedDrivers);
        
        setIsOptimizing(false);
        toast.dismiss(toastId);
        
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

  // Real-time Simulation Thread (Bouncing coordinates, linear navigation, SLA ticking, dynamic order arrivals)
  useEffect(() => {
    const tenant = currentTenant;
    if (!tenant?.id) return;

    const interval = setInterval(async () => {
      setTick((t) => t + 1);

      const activeOrders = [...ordersRef.current];
      const activeDrivers = [...driversRef.current];
      
      let hasOrderChanges = false;
      let hasDriverChanges = false;

      // 1. Move Drivers & Navigate them to assigned orders
      const updatedDrivers = activeDrivers.map((d) => {
        // If driver is offline, don't move
        if (d.status === "offline") return d;

        // If driver is in route, check if they have an active order
        const assignedOrder = activeOrders.find(o => o.driver_id === d.id && !["entregue", "cancelado"].includes(o.status));
        
        if (assignedOrder && d.lat !== null && d.lng !== null && assignedOrder.lat !== null && assignedOrder.lng !== null) {
          hasDriverChanges = true;
          
          // Interpolate coordinate differences to navigate closer to target delivery location!
          const distanceLat = assignedOrder.lat - d.lat;
          const distanceLng = assignedOrder.lng - d.lng;
          const distanceSquared = distanceLat * distanceLat + distanceLng * distanceLng;
          
          // Speed scale factor (simulates moving onSP map viewport)
          const speedFactor = 0.08; 
          const nextLat = d.lat + distanceLat * speedFactor;
          const nextLng = d.lng + distanceLng * speedFactor;

          // If driver reached target coords (distance extremely low)
          if (distanceSquared < 0.000002) {
            // Success! Advance order status to "entregue"
            const oIdx = activeOrders.findIndex(o => o.id === assignedOrder.id);
            if (oIdx !== -1) {
              activeOrders[oIdx] = {
                ...activeOrders[oIdx],
                status: "entregue"
              };
              hasOrderChanges = true;
              
              // Trigger operational success notifications!
              toast.success(`Pedido ${assignedOrder.code} entregue com sucesso por ${d.name}!`, {
                icon: "🚀"
              });
            }

            return {
              ...d,
              status: "disponivel" as const,
              active_orders: 0,
              lat: nextLat,
              lng: nextLng
            };
          }

          // Move along route path
          // Transition statuses dynamically along navigation path
          const oIdx = activeOrders.findIndex(o => o.id === assignedOrder.id);
          if (oIdx !== -1) {
            const currentStatus = activeOrders[oIdx].status;
            if (currentStatus === "em_rota_coleta" && distanceSquared < 0.001) {
              activeOrders[oIdx] = { ...activeOrders[oIdx], status: "retirado" };
              hasOrderChanges = true;
            } else if (currentStatus === "retirado" && distanceSquared < 0.0005) {
              activeOrders[oIdx] = { ...activeOrders[oIdx], status: "em_rota_entrega" };
              hasOrderChanges = true;
            }
          }

          return {
            ...d,
            lat: nextLat,
            lng: nextLng
          };

        } else if (d.lat !== null && d.lng !== null) {
          // Bouncing wander simulation if ocioso/disponivel
          hasDriverChanges = true;
          let nLat = d.lat + d.vy;
          let nLng = d.lng + d.vx;
          let vx = d.vx;
          let vy = d.vy;

          // Map borders constraint checks
          if (nLng < -46.70 || nLng > -46.60) {
            vx = -vx;
            nLng = d.lng + vx;
          }
          if (nLat < -23.60 || nLat > -23.52) {
            vy = -vy;
            nLat = d.lat + vy;
          }

          return {
            ...d,
            lat: nLat,
            lng: nLng,
            vx,
            vy
          };
        }

        return d;
      });

      // 2. Ticking SLAs and elapsed times
      const updatedOrders = activeOrders.map((o) => {
        if (["entregue", "cancelado"].includes(o.status)) return o;

        hasOrderChanges = true;
        // Increment elapsed time slightly (simulated speed rate: 1 minute every 8 seconds!)
        const newElapsed = (o.sla_minutes * 0.005) + (localDb.getSession() ? 0.35 : 0);
        
        // Simulating minutes elapsed
        const elapsedMinutes = Math.min(60, +(o.sla_minutes * 0.05 + 1).toFixed(1)); 
        const placedTime = new Date(new Date(o.placed_at).getTime() - 4000).toISOString();
        
        // Dynamic priority escalation
        const elapsedMin = Math.max(1, Math.floor((Date.now() - new Date(o.placed_at).getTime()) / 60000));
        let priority = o.priority;
        if (elapsedMin > 35) priority = "critica";
        else if (elapsedMin > 25) priority = "alta";
        else if (elapsedMin > 14) priority = "normal";

        return {
          ...o,
          priority
        };
      });

      // 3. Spawns random new incoming orders (8% chance per tick to keep operations alive!)
      const spawnChance = Math.random();
      if (spawnChance < 0.08 && activeOrders.filter(o => o.status !== "entregue").length < 15) {
        const idIdx = Math.floor(Math.random() * 900);
        const nameIdx = Math.floor(Math.random() * 15);
        const distIdx = Math.floor(Math.random() * 8);
        
        const customer = ["Vitor Ramos", "Juliana Lins", "Renan Reis", "Sandra Lima", "Thiago Luz", "Marcos Dias"][nameIdx % 6];
        const district = ["Pinheiros", "Vila Madalena", "Itaim Bibi", "Moema", "Jardins", "Brooklin"][distIdx % 6];
        const total = +(30 + Math.random() * 95).toFixed(2);
        
        // São Paulo bounding coords
        const minLat = -23.59;
        const maxLat = -23.53;
        const minLng = -46.69;
        const maxLng = -46.61;
        const lat = minLat + Math.random() * (maxLat - minLat);
        const lng = minLng + Math.random() * (maxLng - minLng);

        const newSimOrder: LocalOrder = {
          id: `o-spawn-${idIdx}`,
          code: `#${5130 + Math.floor(Math.random() * 500)}`,
          tenant_id: tenant.id,
          customer_name: customer,
          customer_phone: `+551199${Math.floor(1000000 + Math.random() * 8999999)}`,
          address: `${district}, R. das Flores, ${Math.floor(100 + Math.random() * 800)}`,
          items_count: 1 + Math.floor(Math.random() * 3),
          total_amount: total,
          channel: Math.random() > 0.6 ? "iFood" : Math.random() > 0.3 ? "WhatsApp" : "App Próprio",
          sla_minutes: 40,
          placed_at: new Date().toISOString(),
          driver_id: null,
          status: "novo",
          priority: "baixa",
          lat,
          lng
        };

        updatedOrders.unshift(newSimOrder);
        hasOrderChanges = true;

        toast.info(`Novo pedido recebido: ${newSimOrder.code} · ${customer} (${newSimOrder.channel})`, {
          description: `Bairro: ${district} · R$ ${total.toFixed(2)}`,
          icon: "🛎️"
        });
      }

      // Commit changes to states & local storage
      if (hasOrderChanges) {
        setOrders(updatedOrders);
        await orderRepository.batchUpdateOrders(updatedOrders);
      }
      
      if (hasDriverChanges) {
        setDrivers(updatedDrivers);
        await driverRepository.batchUpdateDrivers(updatedDrivers);
      }

      // Re-evaluate diagnostics and update states
      const insights = IaOpsService.generateDiagnostics(updatedOrders, updatedDrivers);
      setIaInsights(insights);

    }, 3000); // Ticking thread runs every 3 seconds

    return () => clearInterval(interval);
  }, [currentTenant]);

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
