import type { LocalOrder } from "@/lib/db/localDb";
import { calcDriverPayout, sumDriverPayouts } from "./driverPayout";

export type DriverDeliveryHistoryItem = {
  orderId: string;
  code: string;
  customerName: string;
  address: string;
  deliveredAt: string;
  payout: number;
  durationMinutes: number | null;
};

export type DriverDayStats = {
  deliveriesToday: number;
  avgDeliveryMinutes: number | null;
  earningsToday: number;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(iso: string): boolean {
  return new Date(iso) >= startOfToday();
}

export function deliveryDurationMinutes(
  order: Pick<LocalOrder, "placed_at"> & { picked_up_at?: string | null; delivered_at?: string | null },
): number | null {
  const end = order.delivered_at ? new Date(order.delivered_at).getTime() : null;
  const start = order.picked_up_at
    ? new Date(order.picked_up_at).getTime()
    : new Date(order.placed_at).getTime();
  if (!end) return null;
  return Math.max(1, Math.round((end - start) / 60_000));
}

export function computeDriverDayStats(
  orders: (LocalOrder & { picked_up_at?: string | null; delivered_at?: string | null })[],
  driverId: string,
): DriverDayStats {
  const completedToday = orders.filter(
    (o) =>
      o.driver_id === driverId &&
      o.status === "entregue" &&
      o.delivered_at &&
      isToday(o.delivered_at),
  );

  const durations = completedToday
    .map((o) => deliveryDurationMinutes(o))
    .filter((m): m is number => m != null);

  const avgDeliveryMinutes =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  return {
    deliveriesToday: completedToday.length,
    avgDeliveryMinutes,
    earningsToday: sumDriverPayouts(completedToday),
  };
}

export function buildDriverHistory(
  orders: (LocalOrder & { picked_up_at?: string | null; delivered_at?: string | null })[],
  driverId: string,
  limit = 20,
): DriverDeliveryHistoryItem[] {
  return orders
    .filter((o) => o.driver_id === driverId && o.status === "entregue" && o.delivered_at)
    .sort((a, b) => new Date(b.delivered_at!).getTime() - new Date(a.delivered_at!).getTime())
    .slice(0, limit)
    .map((o) => ({
      orderId: o.id,
      code: o.code,
      customerName: o.customer_name,
      address: o.address,
      deliveredAt: o.delivered_at!,
      payout: calcDriverPayout(o),
      durationMinutes: deliveryDurationMinutes(o),
    }));
}

export const DRIVER_STATUS_UI: Record<
  string,
  { label: string; tone: string; dot: string; group: "online" | "offline" | "busy" | "available" }
> = {
  disponivel: {
    label: "Disponível",
    tone: "text-success border-success/30 bg-success/5",
    dot: "bg-success",
    group: "available",
  },
  em_rota: {
    label: "Em entrega",
    tone: "text-primary-glow border-primary/30 bg-primary/5",
    dot: "bg-primary-glow",
    group: "busy",
  },
  pausado: {
    label: "Online (pausado)",
    tone: "text-warning border-warning/30 bg-warning/5",
    dot: "bg-warning",
    group: "online",
  },
  offline: {
    label: "Offline",
    tone: "text-muted-foreground border-border bg-surface/30",
    dot: "bg-muted-foreground",
    group: "offline",
  },
};
