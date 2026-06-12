import { createServerFn } from "@tanstack/react-start";
import { upsertAbandonedCartLead } from "@/lib/marketing/abandonedCart";
import { assertCanAccessOpsSnapshot } from "@/lib/rbac";
import { requireSessionUser } from "./session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const { getDb } = await import("@/db/connection.server");
  const { schema } = await import("@/db");
  const { and, eq } = await import("drizzle-orm");
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export const registerAbandonedCartFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantSlug: string;
      phone: string;
      customerName?: string;
      cartJson: string;
      subtotal: number;
    }) => data,
  )
  .handler(async ({ data }) => {
    await upsertAbandonedCartLead(data);
    return { ok: true as const };
  });

export const processAbandonedCartRemindersFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessOpsSnapshot(user, data.tenantId);

    const { processAbandonedCartReminders } = await import(
      "@/lib/marketing/abandonedCartReminders"
    );
    const sent = await processAbandonedCartReminders(data.tenantId);
    return { sent };
  });
