import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { LocalAlert } from "@/lib/db/localDb";
import { mapAlert } from "./mappers";
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

export const listAlertsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<LocalAlert[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.alerts)
      .where(eq(schema.alerts.tenantId, data.tenantId))
      .orderBy(schema.alerts.createdAt);

    return rows.map(mapAlert).reverse();
  });

export const createAlertFn = createServerFn({ method: "POST" })
  .inputValidator((data: { alert: Omit<LocalAlert, "id" | "timestamp" | "agoMin"> }) => data)
  .handler(async ({ data }): Promise<LocalAlert> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.alert.tenant_id);

    const db = getDb();
    const [created] = await db
      .insert(schema.alerts)
      .values({
        tenantId: data.alert.tenant_id,
        level: data.alert.level,
        title: data.alert.title,
        detail: data.alert.detail,
      })
      .returning();

    return mapAlert(created);
  });

export const clearAlertsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    await db.delete(schema.alerts).where(eq(schema.alerts.tenantId, data.tenantId));
  });
