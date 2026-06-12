import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  ABANDONED_CART_DELAY_MINUTES,
  menuUrl,
} from "@/lib/marketing/abandonedCart";
import { isTenantAutomationEnabled } from "@/lib/ops/loadAutomationSettings";
import { pushServerAutomationEvent } from "@/lib/ops/automationEventBus";
import { dispatchWhatsappMessage } from "@/lib/whatsapp/orderNotifications";
import { resolveWhatsappTemplate } from "@/lib/whatsapp/templateStore";
import { renderWhatsappTemplate } from "@/lib/whatsapp/templates";

export async function processAbandonedCartReminders(tenantId: string): Promise<number> {
  if (!(await isTenantAutomationEnabled(tenantId, "abandoned-cart-whatsapp"))) return 0;

  const db = getDb();
  const cutoff = new Date(Date.now() - ABANDONED_CART_DELAY_MINUTES * 60 * 1000);

  const leads = await db
    .select()
    .from(schema.abandonedCartLeads)
    .where(
      and(
        eq(schema.abandonedCartLeads.tenantId, tenantId),
        isNull(schema.abandonedCartLeads.convertedAt),
        isNull(schema.abandonedCartLeads.remindedAt),
        lte(schema.abandonedCartLeads.updatedAt, cutoff),
      ),
    )
    .limit(20);

  if (!leads.length) return 0;

  const template = await resolveWhatsappTemplate(tenantId, "abandoned_cart");
  let sent = 0;

  for (const lead of leads) {
    const total = Number(lead.subtotal).toFixed(2).replace(".", ",");
    const content = renderWhatsappTemplate(template, {
      cliente: lead.customerName?.trim() || "Cliente",
      total: `R$ ${total}`,
      link_cardapio: menuUrl(lead.tenantSlug),
    });

    await dispatchWhatsappMessage({
      tenantId,
      recipientType: "cliente",
      recipientPhone: lead.phone,
      recipientLabel: lead.customerName?.trim() || lead.phone,
      templateKey: "abandoned_cart",
      content,
    });

    await db
      .update(schema.abandonedCartLeads)
      .set({ remindedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.abandonedCartLeads.id, lead.id));

    pushServerAutomationEvent(tenantId, {
      id: `abandoned-${lead.id}`,
      ruleId: "abandoned-cart-whatsapp",
      message: `[WHATSAPP] Carrinho abandonado → ${lead.phone.slice(-4)} (${total})`,
      level: "info",
    });

    sent++;
  }

  return sent;
}
