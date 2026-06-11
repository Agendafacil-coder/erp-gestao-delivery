import type { LocalOrder, LocalDriver, LocalAlert, LocalTenant } from "@/lib/db/localDb";
import { normalizeOrderStatus, type OrderStatus } from "@/lib/ops/orderWorkflow";

type DbOrder = {
  id: string;
  tenantId: string;
  code: string;
  status: string;
  priority: "baixa" | "normal" | "alta" | "critica";
  customerName: string;
  customerPhone: string | null;
  address: string;
  neighborhood?: string | null;
  postalCode?: string | null;
  lat: number | null;
  lng: number | null;
  itemsCount: number;
  subtotalAmount?: string | null;
  deliveryFee?: string | null;
  discountAmount?: string | null;
  totalAmount: string;
  paymentMethod?: string | null;
  paymentStatus?: string;
  channel: string | null;
  notes: string | null;
  slaMinutes: number;
  placedAt: Date;
  pickedUpAt?: Date | null;
  arrivedAt?: Date | null;
  deliveredAt?: Date | null;
  driverId: string | null;
  trackingToken: string | null;
};

type DbDriver = {
  id: string;
  tenantId: string;
  name: string;
  status: "offline" | "disponivel" | "em_rota" | "pausado";
  vehicle: "moto" | "bike" | "carro" | "a_pe";
  lat: number | null;
  lng: number | null;
  activeOrders: number;
  rating: string | null;
};

export function mapOrder(row: DbOrder): LocalOrder {
  const subtotal = row.subtotalAmount != null ? Number(row.subtotalAmount) : Number(row.totalAmount);
  const deliveryFee = row.deliveryFee != null ? Number(row.deliveryFee) : 0;
  const discount = row.discountAmount != null ? Number(row.discountAmount) : 0;

  return {
    id: row.id,
    tenant_id: row.tenantId,
    code: row.code,
    status: normalizeOrderStatus(row.status),
    priority: row.priority,
    customer_name: row.customerName,
    customer_phone: row.customerPhone ?? "",
    address: row.address,
    neighborhood: row.neighborhood ?? null,
    postal_code: row.postalCode ?? null,
    lat: row.lat,
    lng: row.lng,
    items_count: row.itemsCount,
    subtotal_amount: subtotal,
    delivery_fee: deliveryFee,
    discount_amount: discount,
    total_amount: Number(row.totalAmount),
    payment_method: row.paymentMethod ?? null,
    payment_status: (row.paymentStatus as LocalOrder["payment_status"]) ?? "pendente",
    channel: row.channel ?? "",
    notes: row.notes ?? null,
    sla_minutes: row.slaMinutes,
    placed_at: row.placedAt.toISOString(),
    picked_up_at: row.pickedUpAt?.toISOString() ?? null,
    arrived_at: row.arrivedAt?.toISOString() ?? null,
    delivered_at: row.deliveredAt?.toISOString() ?? null,
    driver_id: row.driverId,
    tracking_token: row.trackingToken ?? undefined,
  };
}

export function mapDriver(row: DbDriver): LocalDriver {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    name: row.name,
    status: row.status,
    vehicle: row.vehicle,
    lat: row.lat,
    lng: row.lng,
    active_orders: row.activeOrders,
    rating: Number(row.rating ?? 5),
    vx: 0.0002,
    vy: 0.0002,
  };
}

export function mapAlert(row: {
  id: string;
  tenantId: string;
  level: "low" | "med" | "high" | "crit";
  title: string;
  detail: string;
  createdAt: Date;
}): LocalAlert {
  const agoMin = Math.max(1, Math.floor((Date.now() - row.createdAt.getTime()) / 60000));
  return {
    id: row.id,
    tenant_id: row.tenantId,
    level: row.level,
    title: row.title,
    detail: row.detail,
    agoMin,
    timestamp: row.createdAt.toISOString(),
  };
}

export function mapTenant(row: {
  id: string;
  name: string;
  slug: string;
  plan: string;
}): LocalTenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
  };
}
