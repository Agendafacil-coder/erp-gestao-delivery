import { type OrderStatus } from "@/lib/ops/orderWorkflow";

export type LocalRoleRow = {
  tenant_id: string;
  role: string;
};

export type LocalUser = {
  id: string;
  email: string;
  full_name: string;
  roles?: LocalRoleRow[];
};

export type LocalSession = {
  user: LocalUser | null;
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
  neighborhood?: string | null;
  postal_code?: string | null;
  items_count: number;
  subtotal_amount?: number;
  delivery_fee?: number;
  discount_amount?: number;
  total_amount: number;
  payment_method?: string | null;
  payment_status?: "pendente" | "pago" | "falhou" | "reembolsado";
  channel: string;
  sla_minutes: number;
  placed_at: string;
  driver_id: string | null;
  status: OrderStatus;
  priority: "baixa" | "normal" | "alta" | "critica";
  lat: number | null;
  lng: number | null;
  tracking_token?: string;
  notes?: string | null;
  picked_up_at?: string | null;
  arrived_at?: string | null;
  delivered_at?: string | null;
};

export type LocalFinancialExpense = {
  id: string;
  tenant_id: string;
  description: string;
  amount: number;
  category: "manual" | "fixed" | "variable";
  expense_date: string;
  notes?: string | null;
  created_at: string;
};

export type LocalFinancialCostSetting = {
  id: string;
  tenant_id: string;
  name: string;
  amount: number;
  cost_type: "fixed" | "variable";
  active: boolean;
  notes?: string | null;
};

export type LocalFinancialDailyClosing = {
  id: string;
  tenant_id: string;
  closing_date: string;
  revenue: number;
  delivery_fees: number;
  expenses_total: number;
  fixed_costs: number;
  variable_costs: number;
  estimated_profit: number;
  orders_delivered: number;
  notes?: string | null;
  created_at: string;
};

export type LocalOrderEvent = {
  id: string;
  order_id: string;
  order_code: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  note?: string | null;
  created_at: string;
};

export type LocalOrderLineItem = {
  order_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
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

  getSession(): LocalSession {
    if (typeof window === "undefined") return { user: null };
    const sess = localStorage.getItem("db_session");
    if (!sess) return { user: null };
    const parsed = JSON.parse(sess) as LocalSession | { user: LocalUser | null };
    return { user: parsed.user ?? null };
  },

  setSession(user: LocalUser | null): void {
    if (typeof window === "undefined") return;
    const payload: LocalSession = { user };
    localStorage.setItem("db_session", JSON.stringify(payload));
  },

  // Initialize and Seed database if empty
  initDb() {
    if (typeof window === "undefined") return;
    
    // Check if database has been initialized
    const schemaVersion = "3";
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
    this.set("order_line_items", []);
    this.set("order_events", []);
    this.set("alerts", []);

    localStorage.setItem("db_initialized", schemaVersion);
    console.log("Local database initialized (sem pedidos de exemplo).");
  }
};
