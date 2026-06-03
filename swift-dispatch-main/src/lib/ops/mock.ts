export type { OrderStatus, OrderAction } from "@/lib/ops/orderWorkflow";
export {
  ORDER_STATUSES,
  STATUS_LABEL,
  normalizeOrderStatus,
  getElapsedMinutes,
  isOrderDelayed,
} from "@/lib/ops/orderWorkflow";
export { STATUS_COLOR, STATUS_BADGE_CLASS, DELAYED_BADGE_CLASS, slaBarClass } from "@/lib/ops/statusTheme";

export type Order = {
  id: string;
  code: string;
  customer: string;
  district: string;
  items: number;
  value: number;
  distanceKm: number;
  etaMin: number;
  slaMin: number;
  elapsedMin: number;
  status: import("@/lib/ops/orderWorkflow").OrderStatus;
  driver?: string;
  priority: "low" | "med" | "high" | "crit";
};

const districts = ["Pinheiros", "Vila Madalena", "Itaim", "Moema", "Jardins", "Vila Mariana", "Perdizes", "Brooklin"];
const names = ["Ana S.", "Bruno M.", "Carla R.", "Diego F.", "Elisa P.", "Felipe C.", "Gabi N.", "Heitor L.", "Iza T.", "João V.", "Karen O.", "Lucas D."];
const driversN = ["#E-21 Rafa", "#E-08 Tito", "#E-14 Bia", "#E-33 Caio", "#E-02 Léo", "#E-19 Mari", "—"];

function pick<T>(a: T[], i: number): T { return a[i % a.length]; }

export function seedOrders(n = 14): Order[] {
  const statuses: import("@/lib/ops/orderWorkflow").OrderStatus[] = [
    "novo", "confirmado", "em_preparo", "pronto", "aguardando_entregador", "em_rota_entrega", "entregue",
  ];
  return Array.from({ length: n }, (_, i) => {
    const status = pick(statuses, i + 3);
    const sla = 40;
    const elapsed = Math.floor(5 + ((i * 7) % 50));
    return {
      id: `o${i}`,
      code: `#${4820 + i}`,
      customer: pick(names, i),
      district: pick(districts, i),
      items: 1 + (i % 5),
      value: 35 + (i * 7) % 180,
      distanceKm: +(1.2 + (i % 9) * 0.6).toFixed(1),
      etaMin: 8 + (i * 3) % 22,
      slaMin: sla,
      elapsedMin: elapsed,
      status,
      driver: ["aguardando_entregador", "novo", "em_preparo", "confirmado"].includes(status) ? undefined : pick(driversN, i),
      priority: elapsed > 35 ? "crit" : elapsed > 28 ? "high" : elapsed > 18 ? "med" : "low",
    };
  });
}

export type Driver = {
  id: string;
  name: string;
  status: "online" | "rota" | "ocioso" | "offline";
  deliveries: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

export function seedDrivers(n = 18): Driver[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `d${i}`,
    name: `#E-${(i + 2).toString().padStart(2, "0")}`,
    status: i % 7 === 0 ? "ocioso" : i % 5 === 0 ? "online" : "rota",
    deliveries: (i * 3) % 7,
    x: ((i * 53) % 90) + 5,
    y: ((i * 31) % 80) + 10,
    vx: (i % 2 === 0 ? 1 : -1) * (0.15 + (i % 5) * 0.05),
    vy: (i % 3 === 0 ? 1 : -1) * (0.1 + (i % 4) * 0.04),
  }));
}

export type Alert = {
  id: string;
  level: "low" | "med" | "high" | "crit";
  title: string;
  detail: string;
  agoMin: number;
};

export const seedAlerts: Alert[] = [
  { id: "a1", level: "crit", title: "SLA estourado · #4831", detail: "Pinheiros · entregador parado há 6 min", agoMin: 1 },
  { id: "a2", level: "high", title: "Gargalo na cozinha", detail: "8 pedidos aguardando produção há +15 min", agoMin: 3 },
  { id: "a3", level: "high", title: "Região Itaim congestionada", detail: "ETA médio +42% acima do normal", agoMin: 4 },
  { id: "a4", level: "med", title: "Entregador ocioso", detail: "#E-08 Tito · 12 min sem atribuição", agoMin: 7 },
  { id: "a5", level: "med", title: "Pico de pedidos previsto", detail: "IA estima +30% nos próximos 20 min", agoMin: 9 },
  { id: "a6", level: "low", title: "Rota reotimizada", detail: "Agrupamento de 3 entregas em Moema", agoMin: 12 },
];

export const ALERT_COLOR = {
  low: "border-l-muted-foreground text-muted-foreground",
  med: "border-l-warning text-warning",
  high: "border-l-accent text-accent",
  crit: "border-l-danger text-danger",
} as const;

export function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
