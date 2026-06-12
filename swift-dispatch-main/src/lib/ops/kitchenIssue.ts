import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";
import { dispatchWhatsappMessage } from "@/lib/whatsapp/orderNotifications";

const SLA_EXTENSION_MINUTES = 15;

async function getManagerRecipients(
  db: Db,
  tenantId: string,
): Promise<Array<{ name: string; phone: string }>> {
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

export type KitchenIssueResult = {
  alertId: string;
  slaExtendedMinutes: number;
  whatsappSent: number;
};

/** Registra problema na cozinha: alerta, extensão de SLA e WhatsApp ao gerente. */
export async function reportKitchenIssue(
  db: Db,
  input: {
    tenantId: string;
    orderId: string;
    actorId: string | null;
    issueLabel: string;
  },
): Promise<KitchenIssueResult> {
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, input.orderId), eq(schema.orders.tenantId, input.tenantId)))
    .limit(1);

  if (!order) throw new Error("Pedido não encontrado");

  const detail = `[COZINHA] ${input.issueLabel}`;
  const title = `Problema na cozinha · ${order.code}`;

  const [alert] = await db
    .insert(schema.alerts)
    .values({
      tenantId: input.tenantId,
      level: "high",
      title,
      detail,
    })
    .returning();

  const newSla = (order.slaMinutes ?? 45) + SLA_EXTENSION_MINUTES;
  await db
    .update(schema.orders)
    .set({ slaMinutes: newSla, updatedAt: new Date() })
    .where(and(eq(schema.orders.id, input.orderId), eq(schema.orders.tenantId, input.tenantId)));

  await db.insert(schema.orderEvents).values({
    orderId: input.orderId,
    tenantId: input.tenantId,
    actorId: input.actorId ?? undefined,
    fromStatus: order.status,
    toStatus: order.status,
    note: `${detail} · SLA +${SLA_EXTENSION_MINUTES}min`,
  });

  const managers = await getManagerRecipients(db, input.tenantId);
  const content = `🚨 Cozinha · ${order.code}\n${input.issueLabel}\nCliente: ${order.customerName}\nSLA estendido +${SLA_EXTENSION_MINUTES} min (agora ${newSla} min).`;

  let whatsappSent = 0;
  for (const mgr of managers) {
    await dispatchWhatsappMessage({
      tenantId: input.tenantId,
      orderId: input.orderId,
      recipientType: "gerente",
      recipientPhone: mgr.phone,
      recipientLabel: mgr.name,
      templateKey: "kitchen_issue",
      content,
    });
    whatsappSent += 1;
  }

  return {
    alertId: alert.id,
    slaExtendedMinutes: SLA_EXTENSION_MINUTES,
    whatsappSent,
  };
}
