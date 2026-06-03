import { 
  IAuthRepository, 
  ITenantRepository, 
  IOrderRepository, 
  IDriverRepository, 
  IAlertRepository 
} from "./types";
import { buildLocalRoleRows } from "@/lib/auth/localRoles";
import { localDb, type LocalUser, type LocalTenant, type LocalOrder, type LocalDriver, type LocalAlert } from "../db/localDb";
import type { OrderAction, OrderStatus } from "@/lib/ops/orderWorkflow";
import {
  assertValidTransition,
  canApplyAction,
  getActionTargetStatus,
  normalizeOrderStatus,
} from "@/lib/ops/orderWorkflow";
import type { LocalOrderEvent } from "../db/localDb";

// Simulation delay to mimic a fast enterprise API (e.g. 80ms)
const delay = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

// List of authentication state change listeners
const authListeners: Array<(user: LocalUser | null) => void> = [];

export class LocalAuthRepository implements IAuthRepository {
  async getUser(): Promise<LocalUser | null> {
    await delay();
    return localDb.getSession().user;
  }

  async signIn(email: string, password?: string): Promise<LocalUser> {
    await delay(300); // realistic login check
    
    // Auto-register/authenticate
    const profiles = localDb.get<any>("profiles");
    const name = email.split("@")[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    let existingProfile = profiles.find((p: any) => p.id === "user-default-id");
    if (!existingProfile) {
      existingProfile = {
        id: "user-default-id",
        full_name: formattedName,
        current_tenant_id: "tenant-default-id"
      };
      profiles.push(existingProfile);
      localDb.set("profiles", profiles);
    }

    const user: LocalUser = {
      id: existingProfile.id,
      email,
      full_name: existingProfile.full_name,
      roles: buildLocalRoleRows(email, existingProfile.current_tenant_id ?? "tenant-default-id"),
    };

    localDb.setSession(user);
    authListeners.forEach((cb) => cb(user));
    return user;
  }

  async signUp(email: string, name: string, password?: string): Promise<LocalUser> {
    await delay(400);
    const userId = `u-${Math.random().toString(36).slice(2, 8)}`;
    
    // Create new profile and role
    const profiles = localDb.get<any>("profiles");
    const newProfile = {
      id: userId,
      full_name: name,
      current_tenant_id: "tenant-default-id" // join default
    };
    profiles.push(newProfile);
    localDb.set("profiles", profiles);

    const user: LocalUser = {
      id: userId,
      email,
      full_name: name,
      roles: buildLocalRoleRows(email, "tenant-default-id"),
    };

    localDb.setSession(user);
    authListeners.forEach((cb) => cb(user));
    return user;
  }

  async signOut(): Promise<void> {
    await delay(150);
    localDb.setSession(null);
    authListeners.forEach((cb) => cb(null));
  }

  onAuthStateChange(callback: (user: LocalUser | null) => void): () => void {
    authListeners.push(callback);
    // Return unsubscribe function
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx !== -1) authListeners.splice(idx, 1);
    };
  }
}

export class LocalTenantRepository implements ITenantRepository {
  async getTenants(userId: string): Promise<LocalTenant[]> {
    await delay();
    return localDb.get<LocalTenant>("tenants");
  }

  async getCurrentTenant(userId: string): Promise<LocalTenant | null> {
    await delay();
    const profiles = localDb.get<any>("profiles");
    const profile = profiles.find((p: any) => p.id === userId);
    if (!profile) return null;
    
    const tenants = localDb.get<LocalTenant>("tenants");
    return tenants.find((t) => t.id === profile.current_tenant_id) ?? tenants[0] ?? null;
  }

  async switchTenant(userId: string, tenantId: string): Promise<void> {
    await delay();
    const profiles = localDb.get<any>("profiles");
    const updated = profiles.map((p: any) => 
      p.id === userId ? { ...p, current_tenant_id: tenantId } : p
    );
    localDb.set("profiles", updated);
  }

  async createTenant(name: string): Promise<string> {
    await delay(200);
    const tenants = localDb.get<LocalTenant>("tenants");
    const id = `t-${Math.random().toString(36).slice(2, 8)}`;
    const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 6);
    
    const newTenant: LocalTenant = { id, name, slug, plan: "Starter Plan" };
    tenants.push(newTenant);
    localDb.set("tenants", tenants);
    return id;
  }
}

function logLocalOrderEvent(
  order: LocalOrder,
  fromStatus: OrderStatus | null,
  toStatus: OrderStatus,
  note?: string,
) {
  const events = localDb.get<LocalOrderEvent>("order_events");
  events.unshift({
    id: `ev-${Math.random().toString(36).slice(2, 10)}`,
    order_id: order.id,
    order_code: order.code,
    from_status: fromStatus,
    to_status: toStatus,
    note,
    created_at: new Date().toISOString(),
  });
  localDb.set("order_events", events.slice(0, 500));
}

function clearDriverForStatus(status: OrderStatus): boolean {
  return ["novo", "confirmado", "em_preparo", "pronto"].includes(status);
}

export class LocalOrderRepository implements IOrderRepository {
  async listOrders(tenantId: string): Promise<LocalOrder[]> {
    await delay(50);
    const all = localDb.get<LocalOrder>("orders");
    return all
      .filter((o) => o.tenant_id === tenantId)
      .map((o) => ({ ...o, status: normalizeOrderStatus(o.status) }));
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<LocalOrder> {
    await delay(40);
    const all = localDb.get<LocalOrder>("orders");
    const orderIdx = all.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error("Pedido não encontrado");

    const prev = all[orderIdx];
    const fromStatus = normalizeOrderStatus(prev.status);
    const toStatus = normalizeOrderStatus(status);
    assertValidTransition(fromStatus, toStatus);

    if (toStatus === "em_rota_entrega" && !prev.driver_id) {
      throw new Error("Atribua um entregador antes de marcar saída para entrega.");
    }
    if (toStatus === "entregue" && fromStatus !== "em_rota_entrega") {
      throw new Error("O pedido precisa estar em rota antes de ser marcado como entregue.");
    }

    const updatedOrder: LocalOrder = {
      ...prev,
      status: toStatus,
      driver_id: clearDriverForStatus(toStatus) ? null : prev.driver_id,
    };
    all[orderIdx] = updatedOrder;
    localDb.set("orders", all);
    if (fromStatus !== toStatus) logLocalOrderEvent(prev, fromStatus, toStatus);
    return updatedOrder;
  }

  async applyOrderAction(
    orderId: string,
    action: OrderAction,
    driverId?: string | null,
  ): Promise<LocalOrder> {
    await delay(40);
    const all = localDb.get<LocalOrder>("orders");
    const orderIdx = all.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error("Pedido não encontrado");

    const prev = all[orderIdx];
    const fromStatus = normalizeOrderStatus(prev.status);

    if (action === "atribuir_entregador") {
      if (!driverId) throw new Error("Selecione um entregador.");
      if (!canApplyAction(fromStatus, action)) {
        throw new Error("Não é possível atribuir entregador neste status.");
      }
      const updated: LocalOrder = {
        ...prev,
        driver_id: driverId,
        status: "aguardando_entregador",
      };
      all[orderIdx] = updated;
      localDb.set("orders", all);
      logLocalOrderEvent(prev, fromStatus, "aguardando_entregador", "Entregador atribuído");
      return updated;
    }

    if (!canApplyAction(fromStatus, action, { hasDriver: !!prev.driver_id })) {
      throw new Error(`Ação não permitida no status atual.`);
    }

    const toStatus = getActionTargetStatus(action);
    return this.updateOrderStatus(orderId, toStatus);
  }

  async updateOrderDriver(orderId: string, driverId: string | null, status: OrderStatus): Promise<LocalOrder> {
    await delay(40);
    const all = localDb.get<LocalOrder>("orders");
    const orderIdx = all.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error("Pedido não encontrado");

    const prev = all[orderIdx];
    const fromStatus = normalizeOrderStatus(prev.status);
    const toStatus = normalizeOrderStatus(status);
    assertValidTransition(fromStatus, toStatus);

    const updatedOrder: LocalOrder = {
      ...prev,
      driver_id: driverId,
      status: toStatus,
    };
    all[orderIdx] = updatedOrder;
    localDb.set("orders", all);
    if (fromStatus !== toStatus) logLocalOrderEvent(prev, fromStatus, toStatus);
    return updatedOrder;
  }

  async createOrder(
    order: Omit<LocalOrder, "id" | "placed_at">,
    extras?: import("@/functions/orders").CreateOrderExtras,
  ): Promise<LocalOrder> {
    await delay(80);
    const all = localDb.get<LocalOrder>("orders");
    const id = `o-${Math.random().toString(36).slice(2, 8)}`;
    const placed_at = new Date().toISOString();

    const newOrder: LocalOrder = {
      ...order,
      id,
      placed_at,
      notes: extras?.order_notes?.trim() || order.notes || null,
    };

    all.unshift(newOrder);
    localDb.set("orders", all);
    logLocalOrderEvent(newOrder, null, "novo");

    if (extras?.lines?.length) {
      const lineRows = localDb.get<import("../db/localDb").LocalOrderLineItem>("order_line_items");
      for (const line of extras.lines) {
        lineRows.push({
          order_id: id,
          name: line.name,
          quantity: line.quantity,
          unit_price: line.unit_price,
          notes: line.notes?.trim() || null,
        });
      }
      localDb.set("order_line_items", lineRows);
    }

    return newOrder;
  }

  async listOrderLineItems(orderId: string, _tenantId: string) {
    await delay(30);
    const all = localDb.get<import("../db/localDb").LocalOrderLineItem>("order_line_items") ?? [];
    return all
      .filter((l) => l.order_id === orderId)
      .map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unit_price: l.unit_price,
        notes: l.notes,
      }));
  }

  async batchUpdateOrders(orders: LocalOrder[]): Promise<void> {
    await delay(30);
    const all = localDb.get<LocalOrder>("orders");
    const updatedMap = new Map(orders.map(o => [o.id, o]));
    
    const merged = all.map(o => {
      const match = updatedMap.get(o.id);
      return match ? match : o;
    });
    
    localDb.set("orders", merged);
  }
}

export class LocalDriverRepository implements IDriverRepository {
  async listDrivers(tenantId: string): Promise<LocalDriver[]> {
    await delay(40);
    const all = localDb.get<LocalDriver>("drivers");
    return all.filter((d) => d.tenant_id === tenantId);
  }

  async updateDriverStatus(driverId: string, status: LocalDriver["status"]): Promise<LocalDriver> {
    await delay(30);
    const all = localDb.get<LocalDriver>("drivers");
    const idx = all.findIndex((d) => d.id === driverId);
    if (idx === -1) throw new Error("Driver not found");
    
    const updated = { ...all[idx], status };
    all[idx] = updated;
    localDb.set("drivers", all);
    return updated;
  }

  async updateDriverCoords(driverId: string, lat: number, lng: number): Promise<LocalDriver> {
    const all = localDb.get<LocalDriver>("drivers");
    const idx = all.findIndex((d) => d.id === driverId);
    if (idx === -1) throw new Error("Driver not found");
    
    const updated = { ...all[idx], lat, lng };
    all[idx] = updated;
    localDb.set("drivers", all);
    return updated;
  }

  async batchUpdateDrivers(drivers: LocalDriver[]): Promise<void> {
    const all = localDb.get<LocalDriver>("drivers");
    const updatedMap = new Map(drivers.map(d => [d.id, d]));
    
    const merged = all.map(d => {
      const match = updatedMap.get(d.id);
      return match ? match : d;
    });
    
    localDb.set("drivers", merged);
  }
}

export class LocalAlertRepository implements IAlertRepository {
  async listAlerts(tenantId: string): Promise<LocalAlert[]> {
    await delay(30);
    const all = localDb.get<LocalAlert>("alerts");
    return all.filter((a) => a.tenant_id === tenantId);
  }

  async createAlert(alert: Omit<LocalAlert, "id" | "timestamp">): Promise<LocalAlert> {
    await delay(30);
    const all = localDb.get<LocalAlert>("alerts");
    const id = `a-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();
    
    const newAlert: LocalAlert = {
      ...alert,
      id,
      timestamp
    };
    
    all.unshift(newAlert);
    localDb.set("alerts", all);
    return newAlert;
  }

  async clearAlerts(tenantId: string): Promise<void> {
    await delay(30);
    const all = localDb.get<LocalAlert>("alerts");
    const remaining = all.filter((a) => a.tenant_id !== tenantId);
    localDb.set("alerts", remaining);
  }
}
