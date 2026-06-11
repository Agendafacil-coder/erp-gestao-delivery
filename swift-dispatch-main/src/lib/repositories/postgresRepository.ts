import {
  IAuthRepository,
  ITenantRepository,
  IOrderRepository,
  IDriverRepository,
  IAlertRepository,
} from "./types";
import type { LocalUser, LocalTenant, LocalOrder, LocalDriver, LocalAlert } from "../db/localDb";
import type { OrderAction, OrderStatus } from "@/lib/ops/orderWorkflow";
import type { CreateOrderExtras } from "@/functions/orders";

type AuthListener = (user: LocalUser | null) => void;
const authListeners: AuthListener[] = [];

function sessionToUser(
  session: {
    id: string;
    email: string;
    full_name: string;
    roles?: Array<{ tenant_id: string; role: string }>;
  } | null,
): LocalUser | null {
  if (!session) return null;
  return {
    id: session.id,
    email: session.email,
    full_name: session.full_name,
    roles: session.roles,
  };
}

export class PostgresAuthRepository implements IAuthRepository {
  async getUser(): Promise<LocalUser | null> {
    const { getSessionFn } = await import("@/functions/auth");
    const session = await getSessionFn();
    return sessionToUser(session);
  }

  async signIn(email: string, password?: string): Promise<LocalUser> {
    if (!password) throw new Error("Senha obrigatória");
    const { signInFn } = await import("@/functions/auth");
    const session = await signInFn({ data: { email, password } });
    const user = sessionToUser(session)!;
    authListeners.forEach((cb) => cb(user));
    return user;
  }

  async signUp(email: string, name: string, password?: string): Promise<LocalUser> {
    if (!password) throw new Error("Senha obrigatória");
    const { signUpFn } = await import("@/functions/auth");
    const session = await signUpFn({ data: { email, password, name } });
    const user = sessionToUser(session)!;
    authListeners.forEach((cb) => cb(user));
    return user;
  }

  async signOut(): Promise<void> {
    const { signOutFn } = await import("@/functions/auth");
    await signOutFn();
    authListeners.forEach((cb) => cb(null));
  }

  onAuthStateChange(callback: AuthListener): () => void {
    authListeners.push(callback);
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx !== -1) authListeners.splice(idx, 1);
    };
  }
}

export class PostgresTenantRepository implements ITenantRepository {
  async getTenants(_userId: string): Promise<LocalTenant[]> {
    const { listTenantsFn } = await import("@/functions/tenants");
    return listTenantsFn();
  }

  async getCurrentTenant(_userId: string): Promise<LocalTenant | null> {
    const { getCurrentTenantFn } = await import("@/functions/tenants");
    return getCurrentTenantFn();
  }

  async switchTenant(_userId: string, tenantId: string): Promise<void> {
    const { switchTenantFn } = await import("@/functions/tenants");
    await switchTenantFn({ data: { tenantId } });
  }

  async createTenant(name: string): Promise<string> {
    const { createTenantFn } = await import("@/functions/tenants");
    return createTenantFn({ data: { name } });
  }
}

export class PostgresOrderRepository implements IOrderRepository {
  async listOrders(tenantId: string): Promise<LocalOrder[]> {
    const { listOrdersFn } = await import("@/functions/orders");
    return listOrdersFn({ data: { tenantId } });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<LocalOrder> {
    const { updateOrderStatusFn } = await import("@/functions/orders");
    return updateOrderStatusFn({ data: { orderId, status } });
  }

  async applyOrderAction(
    orderId: string,
    action: OrderAction,
    driverId?: string | null,
  ): Promise<LocalOrder> {
    const { applyOrderActionFn } = await import("@/functions/orders");
    return applyOrderActionFn({ data: { orderId, action, driverId } });
  }

  async updateOrderDriver(
    orderId: string,
    driverId: string | null,
    status: OrderStatus,
  ): Promise<LocalOrder> {
    const { updateOrderDriverFn } = await import("@/functions/orders");
    return updateOrderDriverFn({ data: { orderId, driverId, status } });
  }

  async createOrder(
    order: Omit<LocalOrder, "id" | "placed_at">,
    extras?: CreateOrderExtras,
  ): Promise<LocalOrder> {
    const { createOrderFn } = await import("@/functions/orders");
    return createOrderFn({ data: { order, ...extras } });
  }

  async batchUpdateOrders(orders: LocalOrder[]): Promise<void> {
    const { batchUpdateOrdersFn } = await import("@/functions/orders");
    await batchUpdateOrdersFn({ data: { orders } });
  }

  async listOrderLineItems(orderId: string, tenantId: string) {
    const { listOrderLineItemsFn } = await import("@/functions/publicOrders");
    return listOrderLineItemsFn({ data: { orderId, tenantId } });
  }
}

export class PostgresDriverRepository implements IDriverRepository {
  async listDrivers(tenantId: string): Promise<LocalDriver[]> {
    const { listDriversFn } = await import("@/functions/drivers");
    return listDriversFn({ data: { tenantId } });
  }

  async updateDriverStatus(
    driverId: string,
    status: LocalDriver["status"],
  ): Promise<LocalDriver> {
    const { updateDriverStatusFn } = await import("@/functions/drivers");
    return updateDriverStatusFn({ data: { driverId, status } });
  }

  async updateDriverCoords(driverId: string, lat: number, lng: number): Promise<LocalDriver> {
    const { updateDriverCoordsFn } = await import("@/functions/drivers");
    return updateDriverCoordsFn({ data: { driverId, lat, lng } });
  }

  async batchUpdateDrivers(drivers: LocalDriver[]): Promise<void> {
    const { batchUpdateDriversFn } = await import("@/functions/drivers");
    await batchUpdateDriversFn({ data: { drivers } });
  }
}

export class PostgresAlertRepository implements IAlertRepository {
  async listAlerts(tenantId: string): Promise<LocalAlert[]> {
    const { listAlertsFn } = await import("@/functions/alerts");
    return listAlertsFn({ data: { tenantId } });
  }

  async createAlert(alert: Omit<LocalAlert, "id" | "timestamp" | "agoMin">): Promise<LocalAlert> {
    const { createAlertFn } = await import("@/functions/alerts");
    return createAlertFn({ data: { alert } });
  }

  async clearAlerts(tenantId: string): Promise<void> {
    const { clearAlertsFn } = await import("@/functions/alerts");
    await clearAlertsFn({ data: { tenantId } });
  }
}
