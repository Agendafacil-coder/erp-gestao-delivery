import { useMemo } from "react";
import type { LocalOrder, LocalDriver, LocalAlert } from "@/lib/db/localDb";
import {
  computeOperationalAlerts,
  filterAlertsForSurface,
  getOrderAlerts,
  type MenuCostItem,
  type OperationalAlert,
} from "@/lib/ops/operationalAlerts";

export function useOperationalAlerts(input: {
  orders: LocalOrder[];
  drivers: LocalDriver[];
  storedAlerts?: LocalAlert[];
  menuItems?: MenuCostItem[];
  now?: number;
}) {
  const all = useMemo(
    () =>
      computeOperationalAlerts({
        orders: input.orders,
        drivers: input.drivers,
        storedAlerts: input.storedAlerts,
        menuItems: input.menuItems,
        now: input.now,
      }),
    [
      input.orders,
      input.drivers,
      input.storedAlerts,
      input.menuItems,
      input.now,
    ],
  );

  const dashboard = useMemo(
    () => filterAlertsForSurface(all, "dashboard", {}),
    [all],
  );

  const kitchenOrderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of input.orders) {
      if (["novo", "confirmado", "em_preparo"].includes(o.status)) {
        ids.add(o.id);
      }
    }
    return ids;
  }, [input.orders]);

  const kitchen = useMemo(
    () => filterAlertsForSurface(all, "kitchen", { kitchenOrderIds }),
    [all, kitchenOrderIds],
  );

  return { all, dashboard, kitchen };
}

export function useOrderOperationalAlerts(
  orderId: string | undefined,
  input: {
    orders: LocalOrder[];
    drivers: LocalDriver[];
    storedAlerts?: LocalAlert[];
    menuItems?: MenuCostItem[];
  },
): OperationalAlert[] {
  return useMemo(() => {
    if (!orderId) return [];
    return getOrderAlerts(input.orders, input.drivers, orderId, {
      menuItems: input.menuItems,
      storedAlerts: input.storedAlerts,
    });
  }, [orderId, input.orders, input.drivers, input.storedAlerts, input.menuItems]);
}
