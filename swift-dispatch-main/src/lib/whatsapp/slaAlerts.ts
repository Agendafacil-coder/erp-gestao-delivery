import { and, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { LocalOrder } from "@/lib/db/localDb";
import { elapsedMinutes, isOrderDelayed } from "@/lib/ops/dashboardMetrics";
import { pushServerAutomationEvent } from "@/lib/ops/automationEventBus";
import { isTenantAutomationEnabled } from "@/lib/ops/loadAutomationSettings";
import { TERMINAL_ORDER_STATUSES, normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { dispatchWhatsappMessage } from "@/lib/whatsapp/orderNotifications";
import { resolveWhatsappTemplate } from "@/lib/whatsapp/templateStore";
import { renderWhatsappTemplate } from "@/lib/whatsapp/templates";

const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

async function getManagerRecipients(
  tenantId: string,
): Promise<Array<{ name: string; phone: string }>> {
  const db = getDb();
  const rows = await db
    .select({
      phone: schema.profiles.phone,
      fullName: schema.profiles.fullName,
    })
    .from(schema.userRoles)
    .innerJoin(schema.profiles, eq(schema.userRoles.userId, schema.profiles.id))
    .where(
      and(
        eq(schema.userRoles.tenantId, tenantId),
        inArray(schema.userRoles.role, ["owner", "admin", "manager"]),
      ),
    );

  const fromDb = rows
    .filter((r) => r.phone?.trim())
    .map((r) => ({ name: r.fullName?.trim() || "Gerente", phone: r.phone!.trim() }));

  if (fromDb.length > 0) return fromDb;

  const fallback = process.env.WHATSAPP_MANAGER_PHONE?.trim();
  if (fallback) return [{ name: "Gerente", phone: fallback }];
  return [];
}

async function wasRecentlyNotified(orderId: string, tenantId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - ALERT_COOLDOWN_MS);
  const [row] = await db
    .select({ id: schema.whatsappMessageLogs.id })
    .from(schema.whatsappMessageLogs)
    .where(
      and(
        eq(schema.whatsappMessageLogs.tenantId, tenantId),
        eq(schema.whatsappMessageLogs.orderId, orderId),
        eq(schema.whatsappMessageLogs.templateKey, "manager_sla_alert"),
        gte(schema.whatsappMessageLogs.createdAt, since),
      ),
    )
    .limit(1);
  return !!row;
}

function orderDistrict(address: string, neighborhood: string | null): string {
  if (neighborhood?.trim()) return neighborhood.trim();
  return address.split(",")[0]?.trim() || "—";
}

export async function processTenantSlaWhatsappAlerts(tenantId: string): Promise<number> {
  if (!(await isTenantAutomationEnabled(tenantId, "sla-whatsapp"))) return 0;

  const managers = await getManagerRecipients(tenantId);
  if (managers.length === 0) return 0;

  const db = getDb();
  const now = Date.now();
  const orders = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.tenantId, tenantId));

  const template = await resolveWhatsappTemplate(tenantId, "manager_sla_alert");
  let sent = 0;

  for (const row of orders) {
    const status = normalizeOrderStatus(row.status);
    if ((TERMINAL_ORDER_STATUSES as readonly string[]).includes(status)) continue;

    const local = {
      id: row.id,
      tenant_id: row.tenantId,
      code: row.code,
      status: row.status,
      customer_name: row.customerName,
      address: row.address,
      placed_at: row.placedAt.toISOString(),
      sla_minutes: row.slaMinutes,
    } as LocalOrder;

    if (!isOrderDelayed(local, now)) continue;
    if (await wasRecentlyNotified(row.id, tenantId)) continue;

    const minutes = elapsedMinutes(local.placed_at, now);
    const content = renderWhatsappTemplate(template, {
      pedido: row.code,
      cliente: row.customerName,
      minutos: String(minutes),
      sla: String(row.slaMinutes ?? 40),
      bairro: orderDistrict(row.address, row.neighborhood),
    });

    for (const mgr of managers) {
      await dispatchWhatsappMessage({
        tenantId,
        orderId: row.id,
        recipientType: "gerente",
        recipientPhone: mgr.phone,
        recipientLabel: mgr.name,
        templateKey: "manager_sla_alert",
        content,
      });
      sent++;
    }

    pushServerAutomationEvent(tenantId, {
      id: `sla-wa-${row.id}-${Math.floor(now / 60000)}`,
      ruleId: "sla-whatsapp",
      message: `[WHATSAPP] ${row.code} SLA → gerente (${minutes} min)`,
      level: "warning",
    });
  }

  return sent;
}
