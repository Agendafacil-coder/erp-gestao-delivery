import { type OrderStatus } from "../ops/mock";

export type LocalUser = {
  id: string;
  email: string;
  full_name: string;
};

export type LocalTenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
};

export type LocalProfile = {
  id: string;
  full_name: string;
  current_tenant_id: string | null;
};

export type LocalOrder = {
  id: string;
  code: string;
  tenant_id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  items_count: number;
  total_amount: number;
  channel: string;
  sla_minutes: number;
  placed_at: string;
  driver_id: string | null;
  status: OrderStatus;
  priority: "baixa" | "normal" | "alta" | "critica";
  lat: number | null;
  lng: number | null;
  tracking_token?: string;
};

export type LocalDriver = {
  id: string;
  tenant_id: string;
  name: string;
  status: "disponivel" | "em_rota" | "pausado" | "offline";
  vehicle: "moto" | "bike" | "carro" | "a_pe";
  lat: number | null;
  lng: number | null;
  active_orders: number;
  rating: number;
  // Simulation velocities
  vx: number;
  vy: number;
};

export type LocalAlert = {
  id: string;
  tenant_id: string;
  level: "low" | "med" | "high" | "crit";
  title: string;
  detail: string;
  agoMin: number;
  timestamp: string;
};

export const localDb = {
  // Read collection
  get<T>(key: string): T[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(`db_${key}`);
    return data ? JSON.parse(data) : [];
  },

  // Save collection
  set<T>(key: string, data: T[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`db_${key}`, JSON.stringify(data));
  },

  // Get current active session
  getSession(): { user: LocalUser | null } {
    if (typeof window === "undefined") return { user: null };
    const sess = localStorage.getItem("db_session");
    return sess ? JSON.parse(sess) : { user: null };
  },

  setSession(user: LocalUser | null): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("db_session", JSON.stringify({ user }));
  },

  // Initialize and Seed database if empty
  initDb() {
    if (typeof window === "undefined") return;
    
    // Check if database has been initialized
    const schemaVersion = "2";
    const isInit = localStorage.getItem("db_initialized");
    if (isInit === schemaVersion) return;

    if (isInit === "true") {
      this.set("orders", []);
      this.set("drivers", []);
      this.set("alerts", []);
      localStorage.setItem("db_initialized", schemaVersion);
      console.log("Local database migrada: pedidos/entregadores de exemplo removidos.");
      return;
    }

    console.log("Initializing local database (empty operation)...");

    // 1. Seed Tenant
    const defaultTenantId = "tenant-default-id";
    const tenants: LocalTenant[] = [
      {
        id: defaultTenantId,
        name: "Minha operação",
        slug: "minha-operacao",
        plan: "pro",
      },
    ];
    this.set("tenants", tenants);

    this.set("profiles", []);

    this.setSession(null);

    this.set("drivers", []);
    this.set("orders", []);
    this.set("alerts", []);

    localStorage.setItem("db_initialized", schemaVersion);
    console.log("Local database initialized (sem pedidos de exemplo).");
  }
};
