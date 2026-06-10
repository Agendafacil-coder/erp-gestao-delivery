import { localDb, type LocalDriver, type LocalOrder } from "@/lib/db/localDb";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { pickNextDriverFromList } from "@/lib/drivers/dispatchPick";

const STORAGE_KEY = "tenant_auto_dispatch";

function readMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function getLocalAutoDispatchEnabled(tenantId: string): boolean {
  return readMap()[tenantId] ?? false;
}

export function setLocalAutoDispatchEnabled(tenantId: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  const map = readMap();
  map[tenantId] = enabled;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function maybeLocalAutoAssign(order: LocalOrder): LocalOrder {
  if (!getLocalAutoDispatchEnabled(order.tenant_id)) return order;
  if (normalizeOrderStatus(order.status) !== "aguardando_entregador" || order.driver_id) {
    return order;
  }

  const drivers = localDb
    .get<LocalDriver>("drivers")
    .filter((d) => d.tenant_id === order.tenant_id);
  const driver = pickNextDriverFromList(drivers);
  if (!driver) return order;

  return { ...order, driver_id: driver.id };
}

export function dispatchLocalPendingOrders(tenantId: string): number {
  if (!getLocalAutoDispatchEnabled(tenantId)) return 0;

  const all = localDb.get<LocalOrder>("orders");
  let assigned = 0;
  for (let i = 0; i < all.length; i++) {
    const order = all[i];
    if (order.tenant_id !== tenantId) continue;
    const next = maybeLocalAutoAssign(order);
    if (next.driver_id && next.driver_id !== order.driver_id) {
      all[i] = next;
      assigned++;
    }
  }
  if (assigned > 0) localDb.set("orders", all);
  return assigned;
}

export function updateLocalAutoDispatch(tenantId: string, enabled: boolean): number {
  setLocalAutoDispatchEnabled(tenantId, enabled);
  return enabled ? dispatchLocalPendingOrders(tenantId) : 0;
}

export function applyLocalAutoAssignIfEnabled(order: LocalOrder): LocalOrder {
  return maybeLocalAutoAssign(order);
}
