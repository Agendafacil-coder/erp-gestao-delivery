import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import {
  mapAutomationToAudit,
  mapOrderEventToAudit,
  mapWhatsappToAudit,
  type AuditEntry,
} from "@/lib/ops/auditTrail";
import { mapWhatsappLog } from "@/lib/whatsapp/orderNotifications";
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

export const listAuditTrailFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; limit?: number }) => data)
  .handler(async ({ data }): Promise<AuditEntry[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const perSource = Math.min(Math.floor((data.limit ?? 200) / 3), 100);

    const orderRows = await db
      .select({
        id: schema.orderEvents.id,
        orderId: schema.orderEvents.orderId,
        orderCode: schema.orders.code,
        fromStatus: schema.orderEvents.fromStatus,
        toStatus: schema.orderEvents.toStatus,
        note: schema.orderEvents.note,
        createdAt: schema.orderEvents.createdAt,
        actorName: schema.users.fullName,
        actorEmail: schema.users.email,
      })
      .from(schema.orderEvents)
      .innerJoin(schema.orders, eq(schema.orderEvents.orderId, schema.orders.id))
      .leftJoin(schema.users, eq(schema.orderEvents.actorId, schema.users.id))
      .where(eq(schema.orderEvents.tenantId, data.tenantId))
      .orderBy(desc(schema.orderEvents.createdAt))
      .limit(perSource);

    const automationRows = await db
      .select({
        eventKey: schema.automationEvents.eventKey,
        ruleId: schema.automationEvents.ruleId,
        message: schema.automationEvents.message,
        level: schema.automationEvents.level,
        createdAt: schema.automationEvents.createdAt,
      })
      .from(schema.automationEvents)
      .where(eq(schema.automationEvents.tenantId, data.tenantId))
      .orderBy(desc(schema.automationEvents.createdAt))
      .limit(perSource);

    const whatsappRows = await db
      .select()
      .from(schema.whatsappMessageLogs)
      .where(eq(schema.whatsappMessageLogs.tenantId, data.tenantId))
      .orderBy(desc(schema.whatsappMessageLogs.createdAt))
      .limit(perSource);

    const merged: AuditEntry[] = [
      ...orderRows.map((r) =>
        mapOrderEventToAudit({
          id: r.id,
          orderId: r.orderId,
          orderCode: r.orderCode,
          fromStatus: r.fromStatus ? normalizeOrderStatus(r.fromStatus) : null,
          toStatus: normalizeOrderStatus(r.toStatus),
          note: r.note,
          createdAt: r.createdAt.toISOString(),
          actorName: r.actorName,
          actorEmail: r.actorEmail,
        }),
      ),
      ...automationRows.map((r) =>
        mapAutomationToAudit({
          id: r.eventKey,
          at: r.createdAt.toLocaleTimeString("pt-BR"),
          ruleId: r.ruleId,
          message: r.message,
          level: r.level as "info" | "warn" | "error",
          createdAt: r.createdAt.toISOString(),
        }),
      ),
      ...whatsappRows.map((r) => mapWhatsappToAudit(mapWhatsappLog(r))),
    ];

    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged.slice(0, data.limit ?? 200);
  });
