import { buildIfoodApiHeaders } from "./ifoodHomologation";
import { ensureIfoodAccessToken } from "./tokenStore";

const IFOOD_DISPUTES_BASE = "https://merchant-api.ifood.com.br/order/v1.0";

export async function acceptIfoodDispute(
  tenantId: string,
  disputeId: string,
  input?: { reason?: string; detailReason?: string },
): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");

  const res = await fetch(
    `${IFOOD_DISPUTES_BASE}/disputes/${encodeURIComponent(disputeId)}/accept`,
    {
      method: "POST",
      headers: buildIfoodApiHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        reason: input?.reason ?? "CUSTOMER_SATISFACTION",
        detailReason: input?.detailReason ?? "Aceito via ERP",
      }),
    },
  );

  if (res.status === 204 || res.ok) return;
  const text = await res.text();
  throw new Error(`iFood dispute accept: ${res.status} ${text.slice(0, 200)}`);
}

export async function rejectIfoodDispute(
  tenantId: string,
  disputeId: string,
  input?: { reason?: string; detailReason?: string },
): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");

  const res = await fetch(
    `${IFOOD_DISPUTES_BASE}/disputes/${encodeURIComponent(disputeId)}/reject`,
    {
      method: "POST",
      headers: buildIfoodApiHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        reason: input?.reason ?? "ORDER_ALREADY_DELIVERED",
        detailReason: input?.detailReason ?? "Recusado via ERP",
      }),
    },
  );

  if (res.status === 204 || res.ok) return;
  const text = await res.text();
  throw new Error(`iFood dispute reject: ${res.status} ${text.slice(0, 200)}`);
}

export function extractDisputeId(payload: Record<string, unknown>): string | null {
  const direct = payload.disputeId ?? payload.dispute_id;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const metadata = payload.metadata;
  if (metadata && typeof metadata === "object") {
    const meta = metadata as Record<string, unknown>;
    const nested = meta.disputeId ?? meta.dispute_id;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }

  return null;
}
