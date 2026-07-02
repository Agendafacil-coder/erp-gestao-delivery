import { buildIfoodApiHeaders } from "./ifoodHomologation";
import { ensureIfoodAccessToken } from "./tokenStore";

const IFOOD_FINANCIAL_BASE = "https://merchant-api.ifood.com.br/financial/v3.0";

export type IfoodReconciliationApiResult = {
  competence: string;
  ordersCount: number | null;
  grossAmount: number | null;
  feesAmount: number | null;
  netAmount: number | null;
  downloadUrl: string | null;
  raw: Record<string, unknown>;
};

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "number" && Number.isFinite(val)) return val;
    if (typeof val === "string" && val.trim()) {
      const n = Number(val.replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function parseReconciliationBody(competence: string, body: unknown): IfoodReconciliationApiResult {
  const row =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};

  const downloadUrl =
    (typeof row.downloadPath === "string" && row.downloadPath) ||
    (typeof row.downloadUrl === "string" && row.downloadUrl) ||
    (typeof row.url === "string" && row.url) ||
    null;

  const gross =
    pickNumber(row, ["grossAmount", "gross_amount", "totalGross", "total_gross"]) ??
    pickNumber(row, ["totalSales", "total_sales"]);
  const fees =
    pickNumber(row, ["feesAmount", "fees_amount", "totalFees", "total_fees"]) ??
    pickNumber(row, ["commission", "totalCommission"]);
  const net =
    pickNumber(row, ["netAmount", "net_amount", "totalNet", "total_net", "transferAmount"]) ??
    (gross != null && fees != null ? Number((gross - fees).toFixed(2)) : null);

  const ordersCount =
    pickNumber(row, ["ordersCount", "orders_count", "orderCount", "totalOrders"]) ??
    (typeof row.ordersCount === "number" ? row.ordersCount : null);

  return {
    competence,
    ordersCount: ordersCount != null ? Math.round(ordersCount) : null,
    grossAmount: gross,
    feesAmount: fees,
    netAmount: net,
    downloadUrl,
    raw: row,
  };
}

/** GET reconciliation — competência no formato YYYY-MM */
export async function fetchIfoodReconciliation(
  tenantId: string,
  merchantId: string,
  competence: string,
): Promise<IfoodReconciliationApiResult> {
  const token = await ensureIfoodAccessToken(tenantId);
  if (!token) throw new Error("iFood OAuth não conectado");

  const url = `${IFOOD_FINANCIAL_BASE}/merchants/${encodeURIComponent(merchantId)}/reconciliation?competence=${encodeURIComponent(competence)}`;

  const res = await fetch(url, {
    headers: buildIfoodApiHeaders(token),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iFood Financial: ${res.status} ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as unknown;
  return parseReconciliationBody(competence, body);
}
