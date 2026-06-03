import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DriverDashboardData, DriverOrderView } from "@/functions/driverOps";
import {
  acceptOrderAsDriverFn,
  getDriverDashboardFn,
} from "@/functions/driverOps";
import { getMyDriverFn } from "@/functions/drivers";
import type { LocalDriver, LocalOrder } from "@/lib/db/localDb";
import { localDb } from "@/lib/db/localDb";
import { calcDriverPayout } from "@/lib/drivers/driverPayout";
import {
  buildDriverHistory,
  computeDriverDayStats,
} from "@/lib/drivers/driverStats";
import { normalizeOrderStatus, type OrderAction } from "@/lib/ops/orderWorkflow";
import { driverRepository, orderRepository, USE_POSTGRES } from "@/lib/repositories";
import { useTenant } from "./useTenant";

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
    lat: o.lat,
    lng: o.lng,
    items_count: o.items_count,
    placed_at: o.placed_at,
    picked_up_at: o.picked_up_at ?? null,
    driver_payout: calcDriverPayout(o),
    notes: o.notes ?? null,
  });

  const activeStatuses = ["aguardando_entregador", "em_rota_entrega", "pronto"];
  const myOrders = orders
    .filter(
      (o) => o.driver_id === driver.id && activeStatuses.includes(o.status),
    )
    .map(toView);

  const availableOrders =
    driver.status === "disponivel" || driver.status === "pausado"
      ? orders
          .filter((o) => !o.driver_id && ["pronto", "aguardando_entregador"].includes(o.status))
          .map(toView)
      : [];

  return {
    driver,
    myOrders,
    availableOrders,
    stats: computeDriverDayStats(orders, driver.id),
    history: buildDriverHistory(orders, driver.id),
    allowSelfAccept: true,
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
        const dash = await getDriverDashboardFn({ data: { tenantId: current.id } });
        setData(dash);
      } else {
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

  const acceptOrder = async (orderId: string) => {
    if (!current?.id || !data?.driver) return;
    if (USE_POSTGRES) {
      await acceptOrderAsDriverFn({ data: { tenantId: current.id, orderId } });
    } else {
      await orderRepository.updateOrderDriver(
        orderId,
        data.driver.id,
        "aguardando_entregador",
      );
      await driverRepository.updateDriverStatus(data.driver.id, "em_rota");
    }
    await refresh();
  };

  const applyAction = async (orderId: string, action: OrderAction) => {
    await orderRepository.applyOrderAction(orderId, action);
    if (action === "entregue" && data?.driver) {
      await driverRepository.updateDriverStatus(data.driver.id, "disponivel");
    }
    await refresh();
  };

  return {
    data,
    loading,
    refresh,
    setOnline,
    acceptOrder,
    applyAction,
  };
}
