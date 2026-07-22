import { buildIfoodApiHeaders } from "./ifoodHomologation";
import { ensureIfoodAccessToken } from "./tokenStore";

const IFOOD_CATALOG_BASE = "https://merchant-api.ifood.com.br/catalog/v2.0";

export type IfoodItemStatus = "AVAILABLE" | "UNAVAILABLE";

/**
 * Atualiza disponibilidade de itens no catálogo iFood.
 * Body: [{ itemId, status }] — endpoint de homologação Catalog API.
 */
export async function patchIfoodItemsStatus(
  tenantId: string,
  merchantId: string,
  items: Array<{ itemId: string; status: IfoodItemStatus }>,
): Promise<void> {
  if (items.length === 0) return;

  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");

  const res = await fetch(
    `${IFOOD_CATALOG_BASE}/merchants/${encodeURIComponent(merchantId)}/items/status`,
    {
      method: "PATCH",
      headers: buildIfoodApiHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(items),
    },
  );

  if (res.status === 204 || res.status === 202 || res.ok) return;

  const text = await res.text();
  throw new Error(`iFood catalog status: ${res.status} ${text.slice(0, 200)}`);
}

export async function syncMenuItemAvailabilityToIfood(input: {
  tenantId: string;
  merchantId: string;
  ifoodItemId: string;
  available: boolean;
}): Promise<void> {
  await patchIfoodItemsStatus(input.tenantId, input.merchantId, [
    {
      itemId: input.ifoodItemId.trim(),
      status: input.available ? "AVAILABLE" : "UNAVAILABLE",
    },
  ]);
}
