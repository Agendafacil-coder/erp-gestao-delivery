import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { reportKitchenIssue } from "@/lib/ops/kitchenIssue";
import { assertCanCreateOperationalAlert } from "@/lib/rbac";
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

export const reportKitchenIssueFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; orderId: string; issueLabel: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanCreateOperationalAlert(user, data.tenantId);

    const label = data.issueLabel.trim();
    if (!label) throw new Error("Descreva o problema");

    const db = getDb();
    return reportKitchenIssue(db, {
      tenantId: data.tenantId,
      orderId: data.orderId,
      actorId: user.id,
      issueLabel: label,
    });
  });
