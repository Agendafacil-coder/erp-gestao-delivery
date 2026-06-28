import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { OrderStatus } from "@/lib/ops/orderWorkflow";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { logAutomationDriverAssigned } from "@/lib/ops/automationEventHelpers";
import { publicTrackingUrl } from "@/lib/ops/trackingUrl";
import { resolveWhatsappTemplate } from "@/lib/whatsapp/templateStore";
import { renderWhatsappTemplate, type WhatsappTemplateKey } from "@/lib/whatsapp/templates";

export type WhatsappRecipientType = "cliente" | "entregador" | "gerente";
export type WhatsappMessageStatus = "sent" | "failed" | "pending" | "demo";

export type WhatsappMessageLog = {
  id: string;
  tenant_id: string;
  order_id: string | null;
  recipient_type: WhatsappRecipientType;
  recipient_phone: string | null;
  recipient_label: string;
  template_key: string | null;
  content: string;
  status: WhatsappMessageStatus;
  error_message: string | null;
  created_at: string;
};

const NOTIFY_STATUS: Partial<Record<OrderStatus, WhatsappTemplateKey>> = {
  novo: "order_received",
  em_preparo: "preparing",
  em_rota_entrega: "dispatched",
  entregue: "delivered",
};

function trackingUrl(orderId: string, token: string | null): string {
  return publicTrackingUrl(orderId, token);
}

function formatPhoneLabel(phone: string | null | undefined, name: string): string {
  if (!phone?.trim()) return name;
  const digits = phone.replace(/\D/g, "");
  const tail = digits.slice(-4);
  return tail ? `${name} (+55···${tail})` : name;
}

function orderDistrict(address: string, neighborhood: string | null): string {
  if (neighborhood?.trim()) return neighborhood.trim();
  return address.split(",")[0]?.trim() || "—";
}

function normalizeWhatsappPhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.length <= 11 && !digits.startsWith("55")) digits = `55${digits}`;
  if (digits.length < 12) return null;
  return digits;
}

type SendCreds = {
  provider: "evolution" | "zapi" | "cloud";
  baseUrl: string;
  apiKey: string;
  instance: string;
};

async function sendViaProvider(
  creds: SendCreds,
  phone: string,
  text: string,
): Promise<WhatsappMessageStatus> {
  const digits = normalizeWhatsappPhone(phone);
  if (!digits) return "failed";

  const { baseUrl, apiKey, instance } = creds;

  try {
    if (creds.provider === "zapi") {
      const res = await fetch(
        `${baseUrl}/instances/${instance}/token/${apiKey}/send-text`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: digits, message: text }),
        },
      );
      return res.ok ? "sent" : "failed";
    }

    if (creds.provider === "cloud") {
      const res = await fetch(`${baseUrl}/v21.0/${instance}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: digits,
          type: "text",
          text: { body: text },
        }),
      });
      return res.ok ? "sent" : "failed";
    }

    const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({ number: digits, text }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

async function sendWhatsappApi(
  tenantId: string,
  phone: string,
  text: string,
): Promise<WhatsappMessageStatus> {
  const { resolveWhatsappSendCredentials } = await import("@/lib/whatsapp/apiConfig");
  const creds = await resolveWhatsappSendCredentials(tenantId);
  if (!creds) return "demo";
  return sendViaProvider(creds, phone, text);
}

function mapLog(row: typeof schema.whatsappMessageLogs.$inferSelect): WhatsappMessageLog {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    order_id: row.orderId,
    recipient_type: row.recipientType as WhatsappRecipientType,
    recipient_phone: row.recipientPhone,
    recipient_label: row.recipientLabel,
    template_key: row.templateKey,
    content: row.content,
    status: row.status as WhatsappMessageStatus,
    error_message: row.errorMessage,
    created_at: row.createdAt.toISOString(),
  };
}

export async function dispatchWhatsappMessage(input: {
  tenantId: string;
  orderId?: string | null;
  recipientType?: WhatsappRecipientType;
  recipientPhone?: string | null;
  recipientLabel: string;
  templateKey?: string | null;
  content: string;
}): Promise<WhatsappMessageLog> {
  const db = getDb();
  let status: WhatsappMessageStatus = "demo";
  let errorMessage: string | null = null;

  if (input.recipientPhone?.trim()) {
    status = await sendWhatsappApi(input.tenantId, input.recipientPhone, input.content);
    if (status === "failed") errorMessage = "Falha ao enviar via API WhatsApp";
  }

  const [row] = await db
    .insert(schema.whatsappMessageLogs)
    .values({
      tenantId: input.tenantId,
      orderId: input.orderId ?? null,
      recipientType: input.recipientType ?? "cliente",
      recipientPhone: input.recipientPhone ?? null,
      recipientLabel: input.recipientLabel,
      templateKey: input.templateKey ?? null,
      content: input.content,
      status,
      errorMessage,
    })
    .returning();

  return mapLog(row);
}

async function loadOrderContext(orderId: string) {
  const db = getDb();
  const [order] = await db
    .select({
      id: schema.orders.id,
      tenantId: schema.orders.tenantId,
      code: schema.orders.code,
      customerName: schema.orders.customerName,
      customerPhone: schema.orders.customerPhone,
      address: schema.orders.address,
      neighborhood: schema.orders.neighborhood,
      slaMinutes: schema.orders.slaMinutes,
      trackingToken: schema.orders.trackingToken,
      driverId: schema.orders.driverId,
    })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .limit(1);

  if (!order) return null;

  let driverName = "";
  if (order.driverId) {
    const [driver] = await db
      .select({ name: schema.drivers.name })
      .from(schema.drivers)
      .where(eq(schema.drivers.id, order.driverId))
      .limit(1);
    driverName = driver?.name ?? "";
  }

  return { order, driverName };
}

function buildOrderVars(
  order: NonNullable<Awaited<ReturnType<typeof loadOrderContext>>>["order"],
  driverName: string,
): Record<string, string> {
  return {
    cliente: order.customerName,
    pedido: order.code,
    eta: String(order.slaMinutes ?? 40),
    link_rastreio: trackingUrl(order.id, order.trackingToken),
    entregador: driverName,
    bairro: orderDistrict(order.address, order.neighborhood),
    endereco: order.address,
  };
}

export async function notifyOrderStatusChange(input: {
  orderId: string;
  tenantId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
}): Promise<void> {
  const toNorm = normalizeOrderStatus(input.toStatus);
  const fromNorm = input.fromStatus ? normalizeOrderStatus(input.fromStatus) : null;
  if (fromNorm === toNorm) return;

  const templateKey = NOTIFY_STATUS[toNorm];
  if (!templateKey) return;

  const ctx = await loadOrderContext(input.orderId);
  if (!ctx?.order.customerPhone?.trim()) return;

  const template = await resolveWhatsappTemplate(input.tenantId, templateKey);
  const content = renderWhatsappTemplate(template, buildOrderVars(ctx.order, ctx.driverName));

  await dispatchWhatsappMessage({
    tenantId: input.tenantId,
    orderId: ctx.order.id,
    recipientType: "cliente",
    recipientPhone: ctx.order.customerPhone,
    recipientLabel: formatPhoneLabel(ctx.order.customerPhone, ctx.order.customerName),
    templateKey,
    content,
  });
}

export async function notifyDriverArriving(input: {
  orderId: string;
  tenantId: string;
  distanceM: number;
}): Promise<boolean> {
  const ctx = await loadOrderContext(input.orderId);
  if (!ctx?.order.customerPhone?.trim()) return false;

  const db = getDb();
  const templateKey: WhatsappTemplateKey = "driver_arriving";
  const template = await resolveWhatsappTemplate(input.tenantId, templateKey);
  const vars = buildOrderVars(ctx.order, ctx.driverName);
  vars.distancia = String(input.distanceM);
  const content = renderWhatsappTemplate(template, vars);
  const recipientLabel = formatPhoneLabel(ctx.order.customerPhone, ctx.order.customerName);

  const [claimed] = await db
    .insert(schema.whatsappMessageLogs)
    .values({
      tenantId: input.tenantId,
      orderId: ctx.order.id,
      recipientType: "cliente",
      recipientPhone: ctx.order.customerPhone,
      recipientLabel,
      templateKey,
      content,
      status: "pending",
    })
    .onConflictDoNothing({
      target: [schema.whatsappMessageLogs.orderId, schema.whatsappMessageLogs.templateKey],
    })
    .returning({ id: schema.whatsappMessageLogs.id });

  if (!claimed) return false;

  let status: WhatsappMessageStatus = "demo";
  let errorMessage: string | null = null;
  status = await sendWhatsappApi(input.tenantId, ctx.order.customerPhone, content);
  if (status === "failed") errorMessage = "Falha ao enviar via API WhatsApp";

  await db
    .update(schema.whatsappMessageLogs)
    .set({ status, errorMessage })
    .where(eq(schema.whatsappMessageLogs.id, claimed.id));

  return true;
}

export async function notifyDriverAssigned(input: {
  orderId: string;
  tenantId: string;
  driverId: string;
}): Promise<void> {
  const db = getDb();
  const ctx = await loadOrderContext(input.orderId);
  if (!ctx) return;

  const [driver] = await db
    .select({
      name: schema.drivers.name,
      phone: schema.drivers.phone,
      userId: schema.drivers.userId,
    })
    .from(schema.drivers)
    .where(eq(schema.drivers.id, input.driverId))
    .limit(1);

  if (!driver) return;

  if (driver.userId) {
    const { isTenantAutomationEnabled } = await import("@/lib/ops/loadAutomationSettings");
    const pushEnabled = await isTenantAutomationEnabled(input.tenantId, "driver-push");
    if (pushEnabled) {
      const { sendPushToUser } = await import("@/lib/push/send");
      void sendPushToUser(driver.userId, {
        title: "Novo pedido atribuído",
        body: `Pedido ${ctx.order.code} — ${ctx.order.customerName}`,
        url: "/entregador",
        tag: `order-${ctx.order.id}`,
      }).catch(() => {});
      logAutomationDriverAssigned(
        input.tenantId,
        ctx.order.id,
        ctx.order.code,
        driver.name,
      );
    }
  }

  if (!driver.phone?.trim()) return;

  const templateKey: WhatsappTemplateKey = "driver_assigned";
  const template = await resolveWhatsappTemplate(input.tenantId, templateKey);
  const content = renderWhatsappTemplate(template, buildOrderVars(ctx.order, driver.name));

  await dispatchWhatsappMessage({
    tenantId: input.tenantId,
    orderId: ctx.order.id,
    recipientType: "entregador",
    recipientPhone: driver.phone,
    recipientLabel: formatPhoneLabel(driver.phone, driver.name),
    templateKey,
    content,
  });
}

export { mapLog as mapWhatsappLog };

