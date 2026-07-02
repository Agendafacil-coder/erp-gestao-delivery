import { createServerFn } from "@tanstack/react-start";
import {
  buildProductionReadinessReport,
  type ProductionReadinessReport,
} from "@/lib/server/productionReadiness";
import { requireSessionUser } from "./session";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export const getProductionReadinessFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<ProductionReadinessReport> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    return buildProductionReadinessReport();
  });
