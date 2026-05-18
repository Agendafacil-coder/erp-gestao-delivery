import { type OrderStatus } from "../ops/mock";
import { 
  type LocalUser, 
  type LocalTenant, 
  type LocalOrder, 
  type LocalDriver, 
  type LocalAlert 
} from "../db/localDb";

export interface IAuthRepository {
  getUser(): Promise<LocalUser | null>;
  signIn(email: string, password?: string): Promise<LocalUser>;
  signUp(email: string, name: string, password?: string): Promise<LocalUser>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (user: LocalUser | null) => void): () => void;
}

export interface ITenantRepository {
  getTenants(userId: string): Promise<LocalTenant[]>;
  getCurrentTenant(userId: string): Promise<LocalTenant | null>;
  switchTenant(userId: string, tenantId: string): Promise<void>;
  createTenant(name: string): Promise<string>;
}

export interface IOrderRepository {
  listOrders(tenantId: string): Promise<LocalOrder[]>;
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<LocalOrder>;
  updateOrderDriver(orderId: string, driverId: string | null, status: OrderStatus): Promise<LocalOrder>;
  createOrder(order: Omit<LocalOrder, "id" | "placed_at">): Promise<LocalOrder>;
  batchUpdateOrders(orders: LocalOrder[]): Promise<void>;
}

export interface IDriverRepository {
  listDrivers(tenantId: string): Promise<LocalDriver[]>;
  updateDriverStatus(driverId: string, status: LocalDriver["status"]): Promise<LocalDriver>;
  updateDriverCoords(driverId: string, lat: number, lng: number): Promise<LocalDriver>;
  batchUpdateDrivers(drivers: LocalDriver[]): Promise<void>;
}

export interface IAlertRepository {
  listAlerts(tenantId: string): Promise<LocalAlert[]>;
  createAlert(alert: Omit<LocalAlert, "id" | "timestamp">): Promise<LocalAlert>;
  clearAlerts(tenantId: string): Promise<void>;
}
