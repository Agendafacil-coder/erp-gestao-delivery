import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { IfoodWebhookPayload } from "./types";
import { IFOOD_CANCEL_EVENT_CODES, IFOOD_PLACE_EVENT_CODES, IFOOD_COMPLETE_EVENT_CODES } from "./types";
import { normalizeOrderStatus } from "@/lib/ops/orderWorkflow";
import { logAutomationNewOrder } from "@/lib/ops/automationEventHelpers";
import { notifyOrderStatusChange } from "@/lib/whatsapp/orderNotifications";

function buildAddress(payload: IfoodWebhookPayload): string {
  const addr = payload.delivery?.deliveryAddress;
  if (addr?.formattedAddress?.trim()) return addr.formattedAddress.trim();
  const parts = [
    addr?.streetName,
    addr?.streetNumber,
    addr?.complement,
    addr?.neighborhood,
  ].filter(Boolean);
  return parts.join(", ") || "Endereço iFood";
}

function eventCode(payload: IfoodWebhookPayload): string {
  return (payload.fullCode ?? payload.code ?? "UNKNOWN").toUpperCase();
}

function externalOrderId(payload: IfoodWebhookPayload): string | null {
  const id = payload.orderId ?? payload.id;
  return id?.trim() || null;
}

export function verifyIfoodSignature(
  rawBody: string,
  signature: string | null,
  secret: string | null,
): boolean {
  if (!secret?.trim()) return false;
  if (!signature?.trim()) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}

export async function processIfoodWebhook(input: {
  tenantId: string;
  payload: IfoodWebhookPayload;
  source?: "webhook" | "polling";
  ifoodEventId?: string;
}): Promise<{ orderId: string | null; eventId: string }> {
  const db = getDb();
  const code = eventCode(input.payload);
  const extId = externalOrderId(input.payload);
  const source = input.source ?? "webhook";

  let eventRowId: string | undefined;

  if (input.ifoodEventId) {
    const [byEventId] = await db
      .select({
        id: schema.ifoodInboundEvents.id,
        orderId: schema.ifoodInboundEvents.orderId,
        processed: schema.ifoodInboundEvents.processed,
      })
      .from(schema.ifoodInboundEvents)
      .where(
        and(
          eq(schema.ifoodInboundEvents.tenantId, input.tenantId),
          eq(schema.ifoodInboundEvents.ifoodEventId, input.ifoodEventId),
        ),
      )
      .limit(1);
    if (byEventId?.processed) {
      return { orderId: byEventId.orderId, eventId: byEventId.id };
    }
    if (byEventId) eventRowId = byEventId.id;
  }

  if (!eventRowId && extId) {
    const [dup] = await db
      .select({
        id: schema.ifoodInboundEvents.id,
        orderId: schema.ifoodInboundEvents.orderId,
        processed: schema.ifoodInboundEvents.processed,
      })
      .from(schema.ifoodInboundEvents)
      .where(
        and(
          eq(schema.ifoodInboundEvents.tenantId, input.tenantId),
          eq(schema.ifoodInboundEvents.externalOrderId, extId),
          eq(schema.ifoodInboundEvents.eventType, code),
        ),
      )
      .limit(1);
    if (dup?.processed) return { orderId: dup.orderId, eventId: dup.id };
    if (dup) eventRowId = dup.id;
  }

  if (!eventRowId) {
    const [eventRow] = await db
      .insert(schema.ifoodInboundEvents)
      .values({
        tenantId: input.tenantId,
        eventType: code,
        externalOrderId: extId,
        payload: JSON.stringify(input.payload),
        source,
        ifoodEventId: input.ifoodEventId ?? null,
        processed: false,
      })
      .returning();
    eventRowId = eventRow.id;
  } else {
    await db
      .update(schema.ifoodInboundEvents)
      .set({
        payload: JSON.stringify(input.payload),
        source,
        errorMessage: null,
      })
      .where(eq(schema.ifoodInboundEvents.id, eventRowId));
  }

  try {
    if (IFOOD_PLACE_EVENT_CODES.has(code)) {
      const orderId = await createOrderFromIfoodPayload(input.tenantId, input.payload, extId);
      await db
        .update(schema.ifoodInboundEvents)
        .set({ processed: true, orderId })
        .where(eq(schema.ifoodInboundEvents.id, eventRowId));
      return { orderId, eventId: eventRowId };
    }

    if (IFOOD_CANCEL_EVENT_CODES.has(code) && extId) {
      const orderId = await cancelIfoodOrder(input.tenantId, extId);
      await db
        .update(schema.ifoodInboundEvents)
        .set({ processed: true, orderId })
        .where(eq(schema.ifoodInboundEvents.id, eventRowId));
      return { orderId, eventId: eventRowId };
    }

    if (IFOOD_COMPLETE_EVENT_CODES.has(code) && extId) {
      const orderId = await completeIfoodOrder(input.tenantId, extId);
      await db
        .update(schema.ifoodInboundEvents)
        .set({ processed: true, orderId })
        .where(eq(schema.ifoodInboundEvents.id, eventRowId));
      return { orderId, eventId: eventRowId };
    }

    await db
      .update(schema.ifoodInboundEvents)
      .set({ processed: true })
      .where(eq(schema.ifoodInboundEvents.id, eventRowId));

    return { orderId: null, eventId: eventRowId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar evento iFood";
    await db
      .update(schema.ifoodInboundEvents)
      .set({ errorMessage: message })
      .where(eq(schema.ifoodInboundEvents.id, eventRowId));
    throw err;
  }
}

async function createOrderFromIfoodPayload(
  tenantId: string,
  payload: IfoodWebhookPayload,
  extId: string | null,
): Promise<string> {
  const db = getDb();

  if (extId) {
    const [linked] = await db
      .select({ orderId: schema.ifoodInboundEvents.orderId })
      .from(schema.ifoodInboundEvents)
      .where(
        and(
          eq(schema.ifoodInboundEvents.tenantId, tenantId),
          eq(schema.ifoodInboundEvents.externalOrderId, extId),
        ),
      )
      .limit(1);
    if (linked?.orderId) return linked.orderId;
  }

  const items = payload.items ?? [];
  const itemsCount = items.reduce((s, i) => s + (i.quantity ?? 1), 0) || 1;
  const subtotal =
    items.reduce((s, i) => s + (i.totalPrice ?? (i.unitPrice ?? 0) * (i.quantity ?? 1)), 0) ||
    payload.total?.orderAmount ||
    0;
  const deliveryFee = payload.total?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;
  const codeSuffix = extId?.slice(-4) ?? String(Date.now()).slice(-4);

  const [created] = await db
    .insert(schema.orders)
    .values({
      tenantId,
      storeId: null,
      driverId: null,
      code: `#IF${codeSuffix}`,
      status: "novo",
      priority: "normal",
      customerName: payload.customer?.name?.trim() || "Cliente iFood",
      customerPhone: payload.customer?.phone ?? null,
      address: buildAddress(payload),
      lat: null,
      lng: null,
      itemsCount,
      subtotalAmount: String(Number(subtotal).toFixed(2)),
      deliveryFee: String(Number(deliveryFee).toFixed(2)),
      discountAmount: "0",
      totalAmount: String(Number(total).toFixed(2)),
      paymentMethod: "ifood",
      fulfillmentType: "delivery",
      neighborhood: payload.delivery?.deliveryAddress?.neighborhood ?? null,
      channel: "ifood",
      notes: extId ? `[ifood:${extId}]` : null,
      slaMinutes: 45,
      paymentStatus: "pago",
    })
    .returning();

  for (const item of items) {
    await db.insert(schema.orderLineItems).values({
      orderId: created.id,
      menuItemId: null,
      name: item.name?.trim() || "Item iFood",
      quantity: item.quantity ?? 1,
      unitPrice: String(Number(item.unitPrice ?? item.totalPrice ?? 0).toFixed(2)),
      notes: null,
    });
  }

  await db.insert(schema.orderEvents).values({
    orderId: created.id,
    tenantId,
    toStatus: "novo",
    note: `Importado do iFood${extId ? ` (${extId})` : ""}`,
  });

  void notifyOrderStatusChange({
    orderId: created.id,
    tenantId,
    fromStatus: null,
    toStatus: "novo",
  }).catch(() => {});

  logAutomationNewOrder(tenantId, created.id, created.code, created.customerName, "iFood");

  return created.id;
}

async function cancelIfoodOrder(tenantId: string, extId: string): Promise<string | null> {
  const db = getDb();
  const localOrderId = await findLocalOrderByIfoodExtId(tenantId, extId);
  if (!localOrderId) return null;

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, localOrderId), eq(schema.orders.tenantId, tenantId)))
    .limit(1);

  if (!order) return null;
  const status = normalizeOrderStatus(order.status);
  if (status === "entregue" || status === "cancelado") return order.id;

  await db
    .update(schema.orders)
    .set({ status: "cancelado", updatedAt: new Date() })
    .where(eq(schema.orders.id, order.id));

  await db.insert(schema.orderEvents).values({
    orderId: order.id,
    tenantId,
    fromStatus: status,
    toStatus: "cancelado",
    note: "Cancelado via iFood",
  });

  return order.id;
}

async function completeIfoodOrder(tenantId: string, extId: string): Promise<string | null> {
  const db = getDb();
  const localOrderId = await findLocalOrderByIfoodExtId(tenantId, extId);
  if (!localOrderId) return null;

  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, localOrderId), eq(schema.orders.tenantId, tenantId)))
    .limit(1);

  if (!order) return null;
  const status = normalizeOrderStatus(order.status);
  if (status === "entregue" || status === "cancelado") return order.id;

  await db
    .update(schema.orders)
    .set({ status: "entregue", deliveredAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.orders.id, order.id));

  await db.insert(schema.orderEvents).values({
    orderId: order.id,
    tenantId,
    fromStatus: status,
    toStatus: "entregue",
    note: "Finalizado via iFood",
  });

  void notifyOrderStatusChange({
    orderId: order.id,
    tenantId,
    fromStatus: status,
    toStatus: "entregue",
  }).catch(() => {});

  return order.id;
}

async function findLocalOrderByIfoodExtId(
  tenantId: string,
  extId: string,
): Promise<string | null> {
  const db = getDb();
  const [linked] = await db
    .select({ orderId: schema.ifoodInboundEvents.orderId })
    .from(schema.ifoodInboundEvents)
    .where(
      and(
        eq(schema.ifoodInboundEvents.tenantId, tenantId),
        eq(schema.ifoodInboundEvents.externalOrderId, extId),
      ),
    )
    .limit(1);

  if (linked?.orderId) return linked.orderId;

  const rows = await db
    .select({ id: schema.orders.id, notes: schema.orders.notes })
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.channel, "ifood")));

  for (const row of rows) {
    if (row.notes?.includes(`[ifood:${extId}]`)) return row.id;
  }

  return null;
}

export async function resolveIfoodTenant(merchantId: string | null): Promise<string | null> {
  if (!merchantId?.trim()) return null;
  const db = getDb();
  const rows = await db
    .select({ tenantId: schema.ifoodTenantConfig.tenantId })
    .from(schema.ifoodTenantConfig)
    .where(
      and(
        eq(schema.ifoodTenantConfig.merchantId, merchantId),
        eq(schema.ifoodTenantConfig.enabled, true),
      ),
    )
    .limit(2);

  if (rows.length === 0) return null;
  if (rows.length > 1) return null;
  return rows[0].tenantId;
}
