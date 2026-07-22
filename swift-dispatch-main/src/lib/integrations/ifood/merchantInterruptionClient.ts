import { buildIfoodApiHeaders } from "./ifoodHomologation";
import { ensureIfoodAccessToken } from "./tokenStore";

const IFOOD_MERCHANT_BASE = "https://merchant-api.ifood.com.br/merchant/v1.0";

export type IfoodInterruption = {
  id: string;
  description?: string;
  start?: string;
  end?: string;
};

/** Pausa a loja no iFood por algumas horas (interrupção operacional). */
export async function createIfoodMerchantInterruption(
  tenantId: string,
  merchantId: string,
  options?: { hours?: number; description?: string },
): Promise<string> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");

  const hours = Math.min(24, Math.max(1, options?.hours ?? 4));
  const start = new Date();
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

  const body = {
    description: options?.description?.trim() || "Pausa operacional pelo ERP",
    start: start.toISOString(),
    end: end.toISOString(),
  };

  const res = await fetch(
    `${IFOOD_MERCHANT_BASE}/merchants/${encodeURIComponent(merchantId)}/interruptions`,
    {
      method: "POST",
      headers: buildIfoodApiHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iFood interruption: ${res.status} ${text.slice(0, 200)}`);
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const id =
    (typeof json.id === "string" && json.id) ||
    (typeof json.interruptionId === "string" && json.interruptionId) ||
    null;
  if (!id) throw new Error("iFood não retornou id da interrupção");
  return id;
}

export async function deleteIfoodMerchantInterruption(
  tenantId: string,
  merchantId: string,
  interruptionId: string,
): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");

  const res = await fetch(
    `${IFOOD_MERCHANT_BASE}/merchants/${encodeURIComponent(merchantId)}/interruptions/${encodeURIComponent(interruptionId)}`,
    {
      method: "DELETE",
      headers: buildIfoodApiHeaders(token),
    },
  );

  if (res.status === 204 || res.status === 404 || res.ok) return;

  const text = await res.text();
  throw new Error(`iFood delete interruption: ${res.status} ${text.slice(0, 200)}`);
}
