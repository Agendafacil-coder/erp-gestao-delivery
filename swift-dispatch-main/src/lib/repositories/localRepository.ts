import { 
  IAuthRepository, 
  ITenantRepository, 
  IOrderRepository, 
  IDriverRepository, 
  IAlertRepository 
} from "./types";
import { localDb, type LocalUser, type LocalTenant, type LocalOrder, type LocalDriver, type LocalAlert } from "../db/localDb";
import { type OrderStatus } from "../ops/mock";

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
      full_name: existingProfile.full_name
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
      full_name: name
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

export class LocalOrderRepository implements IOrderRepository {
  async listOrders(tenantId: string): Promise<LocalOrder[]> {
    await delay(50);
    const all = localDb.get<LocalOrder>("orders");
    return all.filter((o) => o.tenant_id === tenantId);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<LocalOrder> {
    await delay(40);
    const all = localDb.get<LocalOrder>("orders");
    const orderIdx = all.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error("Order not found");
    
    const updatedOrder = { 
      ...all[orderIdx], 
      status,
      // Auto adjust fields based on status transitions
      driver_id: status === "aguardando_entregador" || status === "novo" || status === "em_preparo" ? null : all[orderIdx].driver_id
    };
    all[orderIdx] = updatedOrder;
    localDb.set("orders", all);
    return updatedOrder;
  }

  async updateOrderDriver(orderId: string, driverId: string | null, status: OrderStatus): Promise<LocalOrder> {
    await delay(40);
    const all = localDb.get<LocalOrder>("orders");
    const orderIdx = all.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error("Order not found");
    
    const updatedOrder = { 
      ...all[orderIdx], 
      driver_id: driverId,
      status 
    };
    all[orderIdx] = updatedOrder;
    localDb.set("orders", all);
    return updatedOrder;
  }

  async createOrder(order: Omit<LocalOrder, "id" | "placed_at">): Promise<LocalOrder> {
    await delay(80);
    const all = localDb.get<LocalOrder>("orders");
    const id = `o-${Math.random().toString(36).slice(2, 8)}`;
    const placed_at = new Date().toISOString();
    
    const newOrder: LocalOrder = {
      ...order,
      id,
      placed_at
    };
    
    all.unshift(newOrder); // Add to the top
    localDb.set("orders", all);
    return newOrder;
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
