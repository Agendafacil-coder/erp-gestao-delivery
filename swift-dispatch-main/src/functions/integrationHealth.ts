import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  buildTenantIntegrationChecks,
  type TenantIntegrationCheck,
} from "@/lib/integrations/tenantIntegrationHealth";
import { loadTenantFeatureFlags } from "@/lib/tenant/featureFlags.server";
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

export const getTenantIntegrationChecksFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<TenantIntegrationCheck[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const flags = await loadTenantFeatureFlags(data.tenantId);
    return buildTenantIntegrationChecks(data.tenantId, flags);
  });
