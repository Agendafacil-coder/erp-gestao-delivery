const IFOOD_EVENTS_BASE = "https://merchant-api.ifood.com.br/events/v1.0";
const IFOOD_ORDER_BASE = "https://merchant-api.ifood.com.br/order/v1.0";

export type IfoodPollingEvent = {
  id: string;
  code: string;
  fullCode?: string;
  orderId: string;
  merchantId?: string;
  createdAt?: string;
};

async function authGet(accessToken: string, url: string, headers?: Record<string, string>) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
      ...headers,
    },
  });
}

/** GET /events:polling — recomendado a cada 30s */
export async function pollIfoodEvents(
  accessToken: string,
  merchantId?: string | null,
): Promise<IfoodPollingEvent[]> {
  const headers: Record<string, string> = {};
  if (merchantId?.trim()) {
    headers["x-polling-merchants"] = merchantId.trim();
  }

  const res = await authGet(accessToken, `${IFOOD_EVENTS_BASE}/events:polling`, headers);

  if (res.status === 204) return [];

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iFood polling: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as unknown;
  if (!Array.isArray(body)) return [];

  return body
    .map((raw) => {
      const row = raw as Record<string, unknown>;
      const id = String(row.id ?? "");
      const orderId = String(row.orderId ?? row.order_id ?? "");
      const code = String(row.fullCode ?? row.code ?? row.event ?? "").toUpperCase();
      if (!id || !orderId || !code) return null;
      return {
        id,
        code,
        fullCode: row.fullCode ? String(row.fullCode) : undefined,
        orderId,
        merchantId: row.merchantId ? String(row.merchantId) : undefined,
        createdAt: row.createdAt ? String(row.createdAt) : undefined,
      } satisfies IfoodPollingEvent;
    })
    .filter((e): e is IfoodPollingEvent => e !== null);
}

/** POST /events/acknowledgment */
export async function acknowledgeIfoodEvents(
  accessToken: string,
  eventIds: string[],
): Promise<void> {
  if (eventIds.length === 0) return;

  const res = await fetch(`${IFOOD_EVENTS_BASE}/events/acknowledgment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(eventIds.map((id) => ({ id }))),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iFood ACK: ${res.status} ${text.slice(0, 200)}`);
  }
}

/** GET /orders/{id}/virtual-bag */
export async function fetchIfoodVirtualBag(
  accessToken: string,
  orderId: string,
): Promise<Record<string, unknown>> {
  const res = await authGet(
    accessToken,
    `${IFOOD_ORDER_BASE}/orders/${encodeURIComponent(orderId)}/virtual-bag`,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iFood virtual-bag: ${res.status} ${text.slice(0, 200)}`);
  }

  return (await res.json()) as Record<string, unknown>;
}
