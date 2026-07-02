import { food99ApiBase } from "./apiBase";
import type { Food99OrderPayload } from "./types";

export async function fetchFood99Order(
  accessToken: string,
  orderId: string,
  apiBase?: string | null,
): Promise<Food99OrderPayload> {
  const base = food99ApiBase(apiBase);
  const paths = [
    `/opendelivery/v1/orders/${encodeURIComponent(orderId)}`,
    `/v1/orders/${encodeURIComponent(orderId)}`,
  ];

  let lastError = "Falha ao buscar pedido 99Food";

  for (const path of paths) {
    const res = await fetch(`${base}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
    });

    if (!res.ok) {
      lastError = `99Food order ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`;
      continue;
    }

    return (await res.json()) as Food99OrderPayload;
  }

  throw new Error(lastError);
}

export function food99ExternalOrderId(order: Food99OrderPayload): string {
  const raw = order.id ?? order.orderId ?? order.displayId;
  return raw != null ? String(raw) : "";
}

function moneyValue(value: number | { value?: number } | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return Number(value.value ?? 0);
}

export function mapFood99Items(order: Food99OrderPayload) {
  const raw = order.items ?? [];
  return raw.map((item) => {
    const optionNames = (item.options ?? []).map((o) => o.name).filter(Boolean);
    const baseName = item.name?.trim() || "Item 99Food";
    const name = optionNames.length > 0 ? `${baseName} (${optionNames.join(", ")})` : baseName;
    return {
      name,
      quantity: item.quantity ?? 1,
      unitPrice: moneyValue(item.unitPrice ?? item.totalPrice),
    };
  });
}

export function buildFood99Address(order: Food99OrderPayload): string {
  const addr = order.delivery?.deliveryAddress;
  if (addr?.formattedAddress?.trim()) return addr.formattedAddress.trim();
  const parts = [
    addr?.street,
    addr?.number,
    addr?.complement,
    addr?.district ?? addr?.neighborhood,
    addr?.city,
    addr?.state,
  ].filter(Boolean);
  return parts.join(", ") || "Endereço 99Food";
}

export function food99Totals(order: Food99OrderPayload, items: ReturnType<typeof mapFood99Items>) {
  const subtotal =
    moneyValue(order.total?.subTotal) ||
    items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const deliveryFee = moneyValue(order.total?.deliveryFee);
  const total = moneyValue(order.total?.orderAmount) || subtotal + deliveryFee;
  return { subtotal, deliveryFee, total };
}

export function food99CustomerPhone(order: Food99OrderPayload): string | null {
  const phone = order.customer?.phone;
  if (typeof phone === "string") return phone.trim() || null;
  if (phone && typeof phone === "object") return phone.number?.trim() || null;
  return null;
}
