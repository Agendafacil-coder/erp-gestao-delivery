import { food99ApiBase } from "./apiBase";
import type { Food99EventPayload } from "./types";

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    accept: "application/json",
  };
}

function normalizeEvent(raw: Record<string, unknown>): Food99EventPayload | null {
  const id = String(raw.id ?? raw.eventId ?? "").trim();
  const orderId = String(raw.orderId ?? raw.order_id ?? "").trim();
  const eventType = String(
    raw.eventType ?? raw.type ?? raw.code ?? raw.fullCode ?? "",
  ).toUpperCase();
  if (!id || !orderId || !eventType) return null;
  return {
    id,
    eventType,
    orderId,
    merchantId: raw.merchantId ? String(raw.merchantId) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export async function pollFood99Events(
  accessToken: string,
  apiBase?: string | null,
  merchantId?: string | null,
): Promise<Food99EventPayload[]> {
  const base = food99ApiBase(apiBase);
  const paths = ["/opendelivery/v1/events:polling", "/v1/events:polling"];

  let lastError = "Falha no polling 99Food";

  for (const path of paths) {
    const headers: Record<string, string> = { ...authHeaders(accessToken) };
    if (merchantId?.trim()) headers["x-polling-merchants"] = merchantId.trim();

    const res = await fetch(`${base}${path}`, { headers });
    if (res.status === 204) return [];

    if (!res.ok) {
      lastError = `99Food polling ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`;
      continue;
    }

    const body = (await res.json()) as unknown;
    if (!Array.isArray(body)) return [];

    return body
      .map((row) => normalizeEvent(row as Record<string, unknown>))
      .filter((e): e is Food99EventPayload => e !== null);
  }

  throw new Error(lastError);
}

export async function acknowledgeFood99Events(
  accessToken: string,
  eventIds: string[],
  apiBase?: string | null,
): Promise<void> {
  if (eventIds.length === 0) return;

  const base = food99ApiBase(apiBase);
  const paths = ["/opendelivery/v1/events/acknowledgment", "/v1/events/acknowledgment"];
  const payload = eventIds.map((id) => ({ id }));

  let lastError = "Falha no ACK 99Food";

  for (const path of paths) {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 204) return;
    lastError = `99Food ACK ${path}: ${res.status} ${(await res.text()).slice(0, 200)}`;
  }

  throw new Error(lastError);
}
