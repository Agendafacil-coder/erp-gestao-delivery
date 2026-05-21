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

const SP_CENTER: [number, number] = [-46.6388, -23.5489];

// Jitter helpers to generate São Paulo coordinates for live-map bounding box
function randomSPCoord(index: number): [number, number] {
  const minLat = -23.60;
  const maxLat = -23.52;
  const minLng = -46.70;
  const maxLng = -46.60;
  
  // Deterministic but random-looking coordinates
  const latSeed = Math.sin(index * 4529.13) * 0.5 + 0.5;
  const lngSeed = Math.cos(index * 9871.43) * 0.5 + 0.5;
  
  const lat = minLat + latSeed * (maxLat - minLat);
  const lng = minLng + lngSeed * (maxLng - minLng);
  return [lng, lat];
}

const DISTRICTS = ["Pinheiros", "Vila Madalena", "Itaim Bibi", "Moema", "Jardins", "Vila Mariana", "Perdizes", "Brooklin"];
const CUSTOMERS = [
  { name: "Ana Silva", phone: "+5511987654321" },
  { name: "Bruno Melo", phone: "+5511976543210" },
  { name: "Carla Rocha", phone: "+5511965432109" },
  { name: "Diego Farias", phone: "+5511954321098" },
  { name: "Elisa Pires", phone: "+5511943210987" },
  { name: "Felipe Costa", phone: "+5511932109876" },
  { name: "Gabriela Nogueira", phone: "+5511921098765" },
  { name: "Heitor Lopes", phone: "+5511910987654" },
  { name: "Iza Toledo", phone: "+5511909876543" },
  { name: "João Vieira", phone: "+5511998765432" },
  { name: "Karen Oliveira", phone: "+5511987654323" },
  { name: "Lucas Dias", phone: "+5511976543234" },
  { name: "Marcos Lima", phone: "+5511965432345" },
  { name: "Natália Souza", phone: "+5511954323456" },
  { name: "Patrícia Cruz", phone: "+5511943234567" },
  { name: "Rafael Torres", phone: "+5511932345678" }
];

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
    const isInit = localStorage.getItem("db_initialized");
    if (isInit === "true") return;

    console.log("Initializing local database (empty operation)...");

    // 1. Seed Tenant
    const defaultTenantId = "tenant-default-id";
    const tenants: LocalTenant[] = [
      {
        id: defaultTenantId,
        name: "Delivery OS HQ",
        slug: "delivery-os-hq",
        plan: "Enterprise Scale"
      }
    ];
    this.set("tenants", tenants);

    // 2. Seed default Profile
    const defaultUserId = "user-default-id";
    const profiles: LocalProfile[] = [
      {
        id: defaultUserId,
        full_name: "Guilherme Santos",
        current_tenant_id: defaultTenantId
      }
    ];
    this.set("profiles", profiles);

    // 3. Seed active user session (so they bypass the lock and see the dashboard immediately!)
    const activeSession: LocalUser = {
      id: defaultUserId,
      email: "operador@deliveryos.com.br",
      full_name: "Guilherme Santos"
    };
    this.setSession(activeSession);

    this.set("drivers", []);
    this.set("orders", []);
    this.set("alerts", []);

    localStorage.setItem("db_initialized", "true");
    console.log("Local database initialized (sem pedidos de exemplo).");
  }
};
