import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { fetchIfoodReconciliation } from "@/lib/integrations/ifood/financialClient";
import {
  compareIfoodReconciliation,
  computeLocalIfoodSummary,
  type IfoodReconciliationComparison,
} from "@/lib/integrations/ifood/reconciliationCompare";
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

export type IfoodReconciliationImportDto = {
  id: string;
  competence: string;
  orders_count: number | null;
  gross_amount: number | null;
  fees_amount: number | null;
  net_amount: number | null;
  download_url: string | null;
  imported_at: string;
};

function currentCompetence(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const importIfoodReconciliationFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; competence?: string }) => data)
  .handler(async ({ data }): Promise<IfoodReconciliationComparison> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    const competence = data.competence?.trim() || currentCompetence();
    const db = getDb();

    const [config] = await db
      .select()
      .from(schema.ifoodTenantConfig)
      .where(eq(schema.ifoodTenantConfig.tenantId, data.tenantId))
      .limit(1);

    if (!config?.enabled || !config.merchantId?.trim()) {
      throw new Error("Integração iFood não configurada ou merchant ausente");
    }

    const ifood = await fetchIfoodReconciliation(data.tenantId, config.merchantId, competence);
    const local = await computeLocalIfoodSummary(db, data.tenantId, competence);

    const [existing] = await db
      .select({ id: schema.ifoodReconciliationImports.id })
      .from(schema.ifoodReconciliationImports)
      .where(
        and(
          eq(schema.ifoodReconciliationImports.tenantId, data.tenantId),
          eq(schema.ifoodReconciliationImports.competence, competence),
        ),
      )
      .limit(1);

    const values = {
      tenantId: data.tenantId,
      competence,
      ordersCount: ifood.ordersCount,
      grossAmount: ifood.grossAmount != null ? String(ifood.grossAmount) : null,
      feesAmount: ifood.feesAmount != null ? String(ifood.feesAmount) : null,
      netAmount: ifood.netAmount != null ? String(ifood.netAmount) : null,
      downloadUrl: ifood.downloadUrl,
      summaryJson: JSON.stringify(ifood.raw),
      importedAt: new Date(),
    };

    if (existing) {
      await db
        .update(schema.ifoodReconciliationImports)
        .set(values)
        .where(eq(schema.ifoodReconciliationImports.id, existing.id));
    } else {
      await db.insert(schema.ifoodReconciliationImports).values(values);
    }

    return compareIfoodReconciliation(ifood, local);
  });

export const getIfoodReconciliationComparisonFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; competence?: string }) => data)
  .handler(async ({ data }): Promise<IfoodReconciliationComparison | null> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    const competence = data.competence?.trim() || currentCompetence();
    const db = getDb();

    const [row] = await db
      .select()
      .from(schema.ifoodReconciliationImports)
      .where(
        and(
          eq(schema.ifoodReconciliationImports.tenantId, data.tenantId),
          eq(schema.ifoodReconciliationImports.competence, competence),
        ),
      )
      .limit(1);

    const local = await computeLocalIfoodSummary(db, data.tenantId, competence);

    if (!row) {
      return compareIfoodReconciliation(
        {
          competence,
          ordersCount: null,
          grossAmount: null,
          feesAmount: null,
          netAmount: null,
          downloadUrl: null,
          raw: {},
        },
        local,
      );
    }

    return compareIfoodReconciliation(
      {
        competence: row.competence,
        ordersCount: row.ordersCount,
        grossAmount: row.grossAmount != null ? Number(row.grossAmount) : null,
        feesAmount: row.feesAmount != null ? Number(row.feesAmount) : null,
        netAmount: row.netAmount != null ? Number(row.netAmount) : null,
        downloadUrl: row.downloadUrl,
        raw: row.summaryJson ? (JSON.parse(row.summaryJson) as Record<string, unknown>) : {},
      },
      local,
    );
  });

export const listIfoodReconciliationImportsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<IfoodReconciliationImportDto[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    const db = getDb();
    const limit = Math.min(data.limit ?? 12, 24);
    const rows = await db
      .select()
      .from(schema.ifoodReconciliationImports)
      .where(eq(schema.ifoodReconciliationImports.tenantId, data.tenantId))
      .orderBy(desc(schema.ifoodReconciliationImports.importedAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      competence: r.competence,
      orders_count: r.ordersCount,
      gross_amount: r.grossAmount != null ? Number(r.grossAmount) : null,
      fees_amount: r.feesAmount != null ? Number(r.feesAmount) : null,
      net_amount: r.netAmount != null ? Number(r.netAmount) : null,
      download_url: r.downloadUrl,
      imported_at: r.importedAt.toISOString(),
    }));
  });
