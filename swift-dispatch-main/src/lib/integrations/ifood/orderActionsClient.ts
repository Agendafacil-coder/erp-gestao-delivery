import { buildIfoodApiHeaders } from "./ifoodHomologation";
import { ensureIfoodAccessToken } from "./tokenStore";

const IFOOD_ORDER_BASE = "https://merchant-api.ifood.com.br/order/v1.0";

async function ifoodOrderPost(
  accessToken: string,
  orderId: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${IFOOD_ORDER_BASE}/orders/${encodeURIComponent(orderId)}/${action}`, {
    method: "POST",
    headers: buildIfoodApiHeaders(
      accessToken,
      body ? { "Content-Type": "application/json" } : undefined,
    ),
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204 || res.status === 202 || res.ok) return;

  const text = await res.text();
  throw new Error(`iFood ${action}: ${res.status} ${text.slice(0, 200)}`);
}

/** Confirma pedido recebido — requisito de homologação Order API */
export async function confirmIfoodOrder(tenantId: string, ifoodOrderId: string): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");
  await ifoodOrderPost(token, ifoodOrderId, "confirm");
}

/** Inicia preparo na cozinha */
export async function startPreparationIfoodOrder(
  tenantId: string,
  ifoodOrderId: string,
): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");
  await ifoodOrderPost(token, ifoodOrderId, "startPreparation");
}

/** Notifica retirada pronta (TAKEOUT) */
export async function readyToPickupIfoodOrder(
  tenantId: string,
  ifoodOrderId: string,
): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");
  await ifoodOrderPost(token, ifoodOrderId, "readyToPickup");
}

/** Notifica despacho com entrega própria (DELIVERY / MERCHANT) */
export async function dispatchIfoodOrder(tenantId: string, ifoodOrderId: string): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");
  await ifoodOrderPost(token, ifoodOrderId, "dispatch");
}

/** Solicita cancelamento (loja) — reason = código de cancellationReasons */
export async function requestCancellationIfoodOrder(
  tenantId: string,
  ifoodOrderId: string,
  reason = "501",
): Promise<void> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");
  await ifoodOrderPost(token, ifoodOrderId, "requestCancellation", { reason });
}
