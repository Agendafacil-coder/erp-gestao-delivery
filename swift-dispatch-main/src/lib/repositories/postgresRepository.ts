import {
  IAuthRepository,
  ITenantRepository,
  IOrderRepository,
  IDriverRepository,
  IAlertRepository,
} from "./types";
import type { LocalUser, LocalTenant, LocalOrder, LocalDriver, LocalAlert } from "../db/localDb";
import type { OrderStatus } from "../ops/mock";
import { getSessionFn, signInFn, signUpFn, signOutFn } from "@/functions/auth";
import { listTenantsFn, getCurrentTenantFn, switchTenantFn, createTenantFn } from "@/functions/tenants";
import {
  listOrdersFn,
  updateOrderStatusFn,
  updateOrderDriverFn,
  createOrderFn,
  batchUpdateOrdersFn,
} from "@/functions/orders";
import {
  listDriversFn,
  updateDriverStatusFn,
  updateDriverCoordsFn,
  batchUpdateDriversFn,
} from "@/functions/drivers";
import { listAlertsFn, createAlertFn, clearAlertsFn } from "@/functions/alerts";

type AuthListener = (user: LocalUser | null) => void;
const authListeners: AuthListener[] = [];

function sessionToUser(
  session: { id: string; email: string; full_name: string } | null,
): LocalUser | null {
  if (!session) return null;
  return {
    id: session.id,
    email: session.email,
    full_name: session.full_name,
  };
}

export class PostgresAuthRepository implements IAuthRepository {
  async getUser(): Promise<LocalUser | null> {
    const session = await getSessionFn();
    return sessionToUser(session);
  }

  async signIn(email: string, password?: string): Promise<LocalUser> {
    if (!password) throw new Error("Senha obrigatória");
    const session = await signInFn({ data: { email, password } });
    const user = sessionToUser(session)!;
    authListeners.forEach((cb) => cb(user));
    return user;
  }

  async signUp(email: string, name: string, password?: string): Promise<LocalUser> {
    if (!password) throw new Error("Senha obrigatória");
    const session = await signUpFn({ data: { email, password, name } });
    const user = sessionToUser(session)!;
    authListeners.forEach((cb) => cb(user));
    return user;
  }

  async signOut(): Promise<void> {
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
    return listTenantsFn();
  }

  async getCurrentTenant(_userId: string): Promise<LocalTenant | null> {
    return getCurrentTenantFn();
  }

  async switchTenant(_userId: string, tenantId: string): Promise<void> {
    await switchTenantFn({ data: { tenantId } });
  }

  async createTenant(name: string): Promise<string> {
    return createTenantFn({ data: { name } });
  }
}

export class PostgresOrderRepository implements IOrderRepository {
  async listOrders(tenantId: string): Promise<LocalOrder[]> {
    return listOrdersFn({ data: { tenantId } });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<LocalOrder> {
    return updateOrderStatusFn({ data: { orderId, status } });
  }

  async updateOrderDriver(
    orderId: string,
    driverId: string | null,
    status: OrderStatus,
  ): Promise<LocalOrder> {
    return updateOrderDriverFn({ data: { orderId, driverId, status } });
  }

  async createOrder(order: Omit<LocalOrder, "id" | "placed_at">): Promise<LocalOrder> {
    return createOrderFn({ data: { order } });
  }

  async batchUpdateOrders(orders: LocalOrder[]): Promise<void> {
    await batchUpdateOrdersFn({ data: { orders } });
  }
}

export class PostgresDriverRepository implements IDriverRepository {
  async listDrivers(tenantId: string): Promise<LocalDriver[]> {
    return listDriversFn({ data: { tenantId } });
  }

  async updateDriverStatus(
    driverId: string,
    status: LocalDriver["status"],
  ): Promise<LocalDriver> {
    return updateDriverStatusFn({ data: { driverId, status } });
  }

  async updateDriverCoords(driverId: string, lat: number, lng: number): Promise<LocalDriver> {
    return updateDriverCoordsFn({ data: { driverId, lat, lng } });
  }

  async batchUpdateDrivers(drivers: LocalDriver[]): Promise<void> {
    await batchUpdateDriversFn({ data: { drivers } });
  }
}

export class PostgresAlertRepository implements IAlertRepository {
  async listAlerts(tenantId: string): Promise<LocalAlert[]> {
    return listAlertsFn({ data: { tenantId } });
  }

  async createAlert(alert: Omit<LocalAlert, "id" | "timestamp" | "agoMin">): Promise<LocalAlert> {
    return createAlertFn({ data: { alert } });
  }

  async clearAlerts(tenantId: string): Promise<void> {
    await clearAlertsFn({ data: { tenantId } });
  }
}
