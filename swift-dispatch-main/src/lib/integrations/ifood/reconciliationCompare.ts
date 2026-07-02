import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";
import type { IfoodReconciliationApiResult } from "./financialClient";

export type LocalIfoodPeriodSummary = {
  orders_count: number;
  gross_amount: number;
  delivery_fees: number;
};

export type IfoodReconciliationComparison = {
  competence: string;
  ifood: IfoodReconciliationApiResult;
  local: LocalIfoodPeriodSummary;
  delta_orders: number | null;
  delta_gross: number | null;
  delta_net: number | null;
};

function competenceRange(competence: string): { from: Date; to: Date } {
  const [yearStr, monthStr] = competence.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Competência inválida — use YYYY-MM");
  }
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

export async function computeLocalIfoodSummary(
  db: Db,
  tenantId: string,
  competence: string,
): Promise<LocalIfoodPeriodSummary> {
  const { from, to } = competenceRange(competence);

  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      gross: sql<string>`coalesce(sum(${schema.orders.totalAmount}::numeric), 0)`,
      fees: sql<string>`coalesce(sum(${schema.orders.deliveryFee}::numeric), 0)`,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        eq(schema.orders.channel, "ifood"),
        eq(schema.orders.status, "entregue"),
        gte(schema.orders.deliveredAt, from),
        lte(schema.orders.deliveredAt, to),
      ),
    );

  return {
    orders_count: row?.count ?? 0,
    gross_amount: Number(row?.gross ?? 0),
    delivery_fees: Number(row?.fees ?? 0),
  };
}

export function compareIfoodReconciliation(
  ifood: IfoodReconciliationApiResult,
  local: LocalIfoodPeriodSummary,
): IfoodReconciliationComparison {
  return {
    competence: ifood.competence,
    ifood,
    local,
    delta_orders: ifood.ordersCount != null ? local.orders_count - ifood.ordersCount : null,
    delta_gross:
      ifood.grossAmount != null
        ? Number((local.gross_amount - ifood.grossAmount).toFixed(2))
        : null,
    delta_net:
      ifood.netAmount != null ? Number((local.gross_amount - ifood.netAmount).toFixed(2)) : null,
  };
}
