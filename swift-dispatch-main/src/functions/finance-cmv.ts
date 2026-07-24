import { createServerFn } from "@tanstack/react-start";
import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanAccessFinance } from "@/lib/rbac";
import { requireSessionUser } from "./session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export type CmvPeriodSummary = {
  recordedTotal: number;
  entryCount: number;
  ordersWithCmv: number;
  itemsWithCost: number;
  itemsWithoutCost: number;
};

/**
 * CMV já gravado em financial_cmv_entries no período (por recorded_at).
 * Preferir este valor no financeiro quando houver lançamentos.
 */
export const summarizeCmvEntriesFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; from: string; to: string }) => data)
  .handler(async ({ data }): Promise<CmvPeriodSummary> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    const from = new Date(`${data.from}T00:00:00.000-03:00`);
    const to = new Date(`${data.to}T23:59:59.999-03:00`);

    const db = getDb();
    const rows = await db
      .select({
        totalCost: schema.financialCmvEntries.totalCost,
        unitCost: schema.financialCmvEntries.unitCost,
        quantity: schema.financialCmvEntries.quantity,
        orderId: schema.financialCmvEntries.orderId,
      })
      .from(schema.financialCmvEntries)
      .where(
        and(
          eq(schema.financialCmvEntries.tenantId, data.tenantId),
          gte(schema.financialCmvEntries.recordedAt, from),
          lte(schema.financialCmvEntries.recordedAt, to),
        ),
      );

    let recordedTotal = 0;
    let itemsWithCost = 0;
    let itemsWithoutCost = 0;
    const orderIds = new Set<string>();

    for (const row of rows) {
      if (row.orderId) orderIds.add(row.orderId);
      const unit = row.unitCost != null ? Number(row.unitCost) : null;
      const total = row.totalCost != null ? Number(row.totalCost) : null;
      if (total != null && total > 0) {
        recordedTotal += total;
        itemsWithCost += row.quantity;
      } else if (unit != null && unit > 0) {
        recordedTotal += unit * row.quantity;
        itemsWithCost += row.quantity;
      } else {
        itemsWithoutCost += row.quantity;
      }
    }

    return {
      recordedTotal: Number(recordedTotal.toFixed(2)),
      entryCount: rows.length,
      ordersWithCmv: orderIds.size,
      itemsWithCost,
      itemsWithoutCost,
    };
  });
