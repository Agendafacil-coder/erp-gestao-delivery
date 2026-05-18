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

    console.log("Initializing local enterprise database with seeds...");

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

    // 4. Seed Drivers
    const drivers: LocalDriver[] = Array.from({ length: 12 }, (_, i) => {
      const statuses: Array<LocalDriver["status"]> = ["disponivel", "em_rota", "ocioso", "offline"];
      const vehicles: Array<LocalDriver["vehicle"]> = ["moto", "bike", "carro"];
      const status = i % 4 === 0 ? "ocioso" : i % 3 === 0 ? "offline" : i % 2 === 0 ? "disponivel" : "em_rota";
      const [lng, lat] = randomSPCoord(i + 10);
      
      return {
        id: `d-${i}`,
        tenant_id: defaultTenantId,
        name: `#E-${(i + 2).toString().padStart(2, "0")} ${["Tito", "Caio", "Rafa", "Leo", "Mari", "Bia", "Tati", "Vitor", "Guto", "Nando", "Luiz", "Hugo"][i % 12]}`,
        status,
        vehicle: vehicles[i % vehicles.length],
        lat,
        lng,
        active_orders: status === "em_rota" ? Math.floor(1 + (i % 3)) : 0,
        rating: +(4.5 + (i * 0.1) % 0.5).toFixed(1),
        // Velocity vectors for dynamic Mapbox simulation movement
        vx: (i % 2 === 0 ? 1 : -1) * (0.0003 + (i % 5) * 0.00015),
        vy: (i % 3 === 0 ? 1 : -1) * (0.00025 + (i % 4) * 0.00012)
      };
    });
    this.set("drivers", drivers);

    // 5. Seed Orders
    const orders: LocalOrder[] = Array.from({ length: 15 }, (_, i) => {
      const statuses: OrderStatus[] = [
        "novo", "em_preparo", "pronto", "aguardando_entregador",
        "em_rota_coleta", "retirado", "em_rota_entrega", "entregue"
      ];
      // Pick a status distributed across the board
      const status = statuses[i % statuses.length];
      const customer = CUSTOMERS[i % CUSTOMERS.length];
      const district = DISTRICTS[i % DISTRICTS.length];
      const [lng, lat] = randomSPCoord(i);
      
      const placedMinutesAgo = 5 + (i * 6) % 55;
      const placedTime = new Date(Date.now() - placedMinutesAgo * 60000).toISOString();
      const sla = 40;
      
      // Determine priority based on elapsed time relative to SLA
      const priority = placedMinutesAgo > 35 ? "critica" : placedMinutesAgo > 26 ? "alta" : placedMinutesAgo > 15 ? "normal" : "baixa";

      // Assign driver to matching status
      let driverId: string | null = null;
      if (["em_rota_coleta", "retirado", "em_rota_entrega", "entregue"].includes(status)) {
        // Assign one of the in_route drivers
        const routeDrivers = drivers.filter(d => d.status === "em_rota");
        if (routeDrivers.length > 0) {
          driverId = routeDrivers[i % routeDrivers.length].id;
        }
      }

      return {
        id: `o-${i}`,
        code: `#${4820 + i}`,
        tenant_id: defaultTenantId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        address: `${district}, R. das Palmeiras, ${120 + i * 28}`,
        items_count: 1 + (i % 4),
        total_amount: +(35 + (i * 12.5) % 150).toFixed(2),
        channel: i % 3 === 0 ? "iFood" : i % 2 === 0 ? "WhatsApp" : "App Próprio",
        sla_minutes: sla,
        placed_at: placedTime,
        driver_id: driverId,
        status,
        priority,
        lat,
        lng
      };
    });
    this.set("orders", orders);

    // 6. Seed Alerts
    const alerts: LocalAlert[] = [
      {
        id: "a1",
        tenant_id: defaultTenantId,
        level: "crit",
        title: "SLA estourado · #4831",
        detail: "Moema · entregador parado há 6 min",
        agoMin: 1,
        timestamp: new Date().toISOString()
      },
      {
        id: "a2",
        tenant_id: defaultTenantId,
        level: "high",
        title: "Gargalo na cozinha",
        detail: "8 pedidos aguardando produção há +15 min",
        agoMin: 3,
        timestamp: new Date().toISOString()
      },
      {
        id: "a3",
        tenant_id: defaultTenantId,
        level: "high",
        title: "Região Itaim congestionada",
        detail: "ETA médio +42% acima do normal",
        agoMin: 4,
        timestamp: new Date().toISOString()
      },
      {
        id: "a4",
        tenant_id: defaultTenantId,
        level: "med",
        title: "Entregador ocioso",
        detail: "#E-08 Tito · 12 min sem atribuição",
        agoMin: 7,
        timestamp: new Date().toISOString()
      },
      {
        id: "a5",
        tenant_id: defaultTenantId,
        level: "med",
        title: "Pico de pedidos previsto",
        detail: "IA estima +30% nos próximos 20 min",
        agoMin: 9,
        timestamp: new Date().toISOString()
      },
      {
        id: "a6",
        tenant_id: defaultTenantId,
        level: "low",
        title: "Rota reotimizada",
        detail: "Agrupamento de 3 entregas em Moema",
        agoMin: 12,
        timestamp: new Date().toISOString()
      }
    ];
    this.set("alerts", alerts);

    // Flag as initialized
    localStorage.setItem("db_initialized", "true");
    console.log("Local database successfully seeded.");
  }
};
