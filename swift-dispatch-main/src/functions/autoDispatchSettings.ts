import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  mapTenantMenuSettingsRow,
  type TenantMenuSettingsDto,
} from "@/lib/menu/public-settings";
import { assertCanBatchDispatch } from "@/lib/rbac";
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

export const updateAutoDispatchFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; enabled: boolean }) => data)
  .handler(async ({ data }): Promise<{ settings: TenantMenuSettingsDto; assigned: number }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanBatchDispatch(user, data.tenantId);

    const db = getDb();
    const patch = {
      autoDispatchEnabled: data.enabled,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(schema.tenantMenuSettings)
        .set(patch)
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
        .returning();
    } else {
      [row] = await db
        .insert(schema.tenantMenuSettings)
        .values({
          tenantId: data.tenantId,
          ...patch,
        })
        .returning();
    }

    let assigned = 0;
    if (data.enabled) {
      const { autoDispatchPendingOrders } = await import("@/lib/drivers/autoDispatch");
      assigned = await autoDispatchPendingOrders(
        db,
        data.tenantId,
        user.id,
        async (orderId, tenantId, actorId, fromStatus, toStatus, note) => {
          await db.insert(schema.orderEvents).values({
            orderId,
            tenantId,
            actorId: actorId ?? undefined,
            fromStatus: fromStatus as typeof schema.orderEvents.$inferInsert.fromStatus,
            toStatus: toStatus as typeof schema.orderEvents.$inferInsert.toStatus,
            note,
          });
        },
      );
    }

    return { settings: mapTenantMenuSettingsRow(row), assigned };
  });
