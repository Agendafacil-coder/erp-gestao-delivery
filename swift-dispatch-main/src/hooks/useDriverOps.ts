import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DriverDashboardData, DriverOrderView } from "@/lib/drivers/driverOps.types";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { localDb } from "@/lib/db/localDb";
import { calcDriverPayout } from "@/lib/drivers/driverPayout";
import {
  buildDriverHistory,
  computeDriverDayStats,
} from "@/lib/drivers/driverStats";
import {
  isDriverActiveOrder,
  normalizeOrderStatus,
  type OrderAction,
} from "@/lib/ops/orderWorkflow";
import { driverRepository, orderRepository, USE_POSTGRES } from "@/lib/repositories";
import { DispatchService } from "@/lib/services/DispatchService";
import { useTenant } from "./useTenant";

function driverOrdersForScan(
  views: DriverOrderView[],
  tenantId: string,
  driverId: string,
): LocalOrder[] {
  return views.map(
    (o) =>
      ({
        id: o.id,
        code: o.code,
        status: o.status,
        tenant_id: tenantId,
        driver_id: driverId,
        picked_up_at: o.picked_up_at ?? undefined,
        customer_name: o.customer_name,
        address: o.address,
        placed_at: o.placed_at,
        items_count: o.items_count,
        channel: "",
        priority: "normal",
        sla_minutes: 30,
        payment_method: "on_delivery",
        payment_status: "pendente",
        lat: o.lat,
        lng: o.lng,
      }) as LocalOrder,
  );
}

function buildLocalDashboard(
  tenantId: string,
  driver: LocalDriver,
): DriverDashboardData {
  const orders = localDb
    .get<LocalOrder>("orders")
    .filter((o) => o.tenant_id === tenantId)
    .map((o) => ({ ...o, status: normalizeOrderStatus(o.status) }));

  const toView = (o: LocalOrder): DriverOrderView => ({
    id: o.id,
    code: o.code,
    status: o.status,
    customer_name: o.customer_name,
    customer_phone: o.customer_phone,
    address: o.address,
    neighborhood: o.neighborhood ?? null,
    postal_code: o.postal_code ?? null,
    lat: o.lat,
    lng: o.lng,
    items_count: o.items_count,
    placed_at: o.placed_at,
    picked_up_at: o.picked_up_at ?? null,
    driver_payout: calcDriverPayout(o),
    notes: o.notes ?? null,
  });

  const myOrders = orders
    .filter((o) => o.driver_id === driver.id && isDriverActiveOrder(o.status))
    .map(toView);

  return {
    driver,
    myOrders,
    store: null,
    stats: computeDriverDayStats(orders, driver.id),
    history: buildDriverHistory(orders, driver.id),
  };
}

export function useDriverOps() {
  const { current } = useTenant();
  const [data, setData] = useState<DriverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!current?.id) return;
    setLoading(true);
    try {
      if (USE_POSTGRES) {
        const { getDriverDashboardFn } = await import("@/functions/driverOps");
        const dash = await getDriverDashboardFn({ data: { tenantId: current.id } });
        setData(dash);
      } else {
        const { getMyDriverFn } = await import("@/functions/drivers");
        const mine =
          (await getMyDriverFn({ data: { tenantId: current.id } }).catch(() => null)) ??
          (await driverRepository.listDrivers(current.id))[0] ??
          null;
        if (!mine) {
          setData(null);
          return;
        }
        setData(buildLocalDashboard(current.id, mine));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [current?.id]);

  useEffect(() => {
    void refresh();
    if (!current?.id) return;
    const id = setInterval(() => void refresh(), USE_POSTGRES ? 12_000 : 5_000);
    return () => clearInterval(id);
  }, [current?.id, refresh]);

  const setOnline = async (online: boolean) => {
    if (!data?.driver) return;
    await driverRepository.updateDriverStatus(
      data.driver.id,
      online ? "disponivel" : "offline",
    );
    await refresh();
  };

  const applyAction = async (orderId: string, action: OrderAction) => {
    if (!data?.driver) throw new Error("Conta não vinculada a entregador.");
    if (!USE_POSTGRES) {
      const order = localDb.get<LocalOrder>("orders").find((o) => o.id === orderId);
      if (!order || order.driver_id !== data.driver.id) {
        throw new Error("Pedido não atribuído a você.");
      }
    }
    await orderRepository.applyOrderAction(orderId, action);
    if (action === "entregue" && data.driver) {
      await driverRepository.updateDriverStatus(data.driver.id, "disponivel");
    }
    await refresh();
  };

  const handleScanCode = async (code: string): Promise<boolean> => {
    if (!data?.driver || !current?.id) return false;

    const ordersForScan = driverOrdersForScan(data.myOrders, current.id, data.driver.id);
    const result = DispatchService.processDriverTicketScan(code, ordersForScan);
    if (!result) {
      throw new Error(DispatchService.explainDriverTicketScanFailure(code, ordersForScan));
    }

    if (result.kind === "retirei") {
      await applyAction(result.order.id, "retirei_pedido");
    } else if (result.nextStatus === "em_rota_entrega") {
      await applyAction(result.order.id, "saiu_entrega");
    } else if (result.nextStatus === "entregue") {
      await applyAction(result.order.id, "entregue");
    }
    return true;
  };

  return {
    data,
    loading,
    refresh,
    setOnline,
    applyAction,
    handleScanCode,
  };
}
