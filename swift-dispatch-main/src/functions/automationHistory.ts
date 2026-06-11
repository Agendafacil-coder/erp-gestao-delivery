import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { AutomationEvent } from "@/lib/ops/detectAutomationEvents";
import { loadAutomationHistoryForExport } from "@/lib/ops/automationEventBus";
import { assertCanAccessOpsSnapshot } from "@/lib/rbac";
import { requireSessionUser } from "./session";

export type AutomationHistoryRow = AutomationEvent & { atIso: string };

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export const getAutomationHistoryFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<AutomationHistoryRow[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessOpsSnapshot(user, data.tenantId);

    const limit = Math.min(200, Math.max(1, data.limit ?? 200));
    return loadAutomationHistoryForExport(data.tenantId, limit);
  });
