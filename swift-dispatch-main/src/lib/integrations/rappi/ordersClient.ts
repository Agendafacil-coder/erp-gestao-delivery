import { ensureRappiAccessToken, rappiApiBase } from "./oauthClient";
import type { RappiOrderPayload } from "./types";

async function rappiAuthFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await ensureRappiAccessToken();
  if (!token)
    throw new Error("Rappi OAuth não configurado (RAPPI_CLIENT_ID / RAPPI_CLIENT_SECRET)");

  return fetch(`${rappiApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export function rappiExternalOrderId(order: RappiOrderPayload): string {
  const raw = order.order_id ?? order.id;
  return raw != null ? String(raw) : "";
}

/** GET pedidos READY da loja */
export async function fetchRappiStoreOrders(storeId: string): Promise<RappiOrderPayload[]> {
  const res = await rappiAuthFetch(
    `/restaurants/orders/v1/stores/${encodeURIComponent(storeId)}/orders`,
  );

  if (res.status === 204) return [];

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rappi orders: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as unknown;
  if (Array.isArray(body)) return body as RappiOrderPayload[];
  if (body && typeof body === "object") {
    const row = body as Record<string, unknown>;
    if (Array.isArray(row.orders)) return row.orders as RappiOrderPayload[];
    if (Array.isArray(row.data)) return row.data as RappiOrderPayload[];
  }
  return [];
}

/** Aceita pedido na Rappi (take order) */
export async function takeRappiOrder(storeId: string, orderId: string): Promise<void> {
  const res = await rappiAuthFetch(
    `/restaurants/orders/v1/stores/${encodeURIComponent(storeId)}/orders/${encodeURIComponent(orderId)}/take`,
    { method: "PUT" },
  );

  if (res.status === 204 || res.ok) return;

  const text = await res.text();
  throw new Error(`Rappi take: ${res.status} ${text.slice(0, 200)}`);
}
