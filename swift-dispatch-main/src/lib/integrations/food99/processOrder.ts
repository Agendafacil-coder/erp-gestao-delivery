import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { buildNavigationAddress } from "@/lib/geo/addressNavigation";
import { resolveOrderCoordinates } from "@/lib/geo/geocode";
import { mapTenantMenuSettingsRow, DEFAULT_MENU_SETTINGS } from "@/lib/menu/public-settings";
import { logAutomationNewOrder } from "@/lib/ops/automationEventHelpers";
import { notifyOrderStatusChange } from "@/lib/whatsapp/orderNotifications";
import { isTenantFeatureEnabled } from "@/lib/tenant/featureFlags.server";
import {
  buildFood99Address,
  fetchFood99Order,
  food99CustomerPhone,
  food99ExternalOrderId,
  food99Totals,
  mapFood99Items,
} from "./ordersClient";
import { ensureFood99AccessToken } from "./tokenStore";
import type { Food99EventPayload, Food99OrderPayload, Food99WebhookPayload } from "./types";
import { FOOD99_PLACE_EVENT_CODES } from "./types";

const FOOD99_NOTE_RE = /\[99food:([^\]]+)\]/i;

export function verifyFood99Signature(
  rawBody: string,
  signature: string | null,
  secret: string | null,
): boolean {
  if (!secret?.trim()) return true;
  if (!signature?.trim()) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}

export async function resolveFood99Tenant(merchantId: string | null): Promise<string | null> {
  if (!merchantId?.trim()) return null;
  const db = getDb();
  const [row] = await db
    .select({ tenantId: schema.food99TenantConfig.tenantId })
    .from(schema.food99TenantConfig)
    .where(
      and(
        eq(schema.food99TenantConfig.merchantId, merchantId.trim()),
        eq(schema.food99TenantConfig.enabled, true),
      ),
    )
    .limit(1);
  return row?.tenantId ?? null;
}

async function findLocalOrderByFood99ExtId(
  tenantId: string,
  extId: string,
): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.orders.id, notes: schema.orders.notes })
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.channel, "99food")));

  for (const row of rows) {
    if (row.notes?.includes(`[99food:${extId}]`)) return row.id;
    const match = row.notes?.match(FOOD99_NOTE_RE);
    if (match?.[1] === extId) return row.id;
  }
  return null;
}

function eventType(payload: Food99EventPayload): string {
  return String(payload.eventType ?? payload.type ?? payload.code ?? "").toUpperCase();
}

function isPlaceEvent(code: string): boolean {
  if (FOOD99_PLACE_EVENT_CODES.has(code)) return true;
  return code.includes("PLACED") || code.includes("CREATED") || code.includes("CONFIRMED");
}

export async function processFood99Order(input: {
  tenantId: string;
  payload: Food99OrderPayload;
  source?: "webhook" | "polling";
}): Promise<{ orderId: string | null }> {
  if (!(await isTenantFeatureEnabled(input.tenantId, "marketplace_99food"))) {
    throw new Error("Integração 99Food desativada para este tenant");
  }

  const extId = food99ExternalOrderId(input.payload);
  if (!extId) return { orderId: null };

  const existing = await findLocalOrderByFood99ExtId(input.tenantId, extId);
  if (existing) return { orderId: existing };

  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.food99TenantConfig)
    .where(eq(schema.food99TenantConfig.tenantId, input.tenantId))
    .limit(1);

  if (!config?.enabled || !config.merchantId?.trim()) {
    throw new Error("Integração 99Food não configurada");
  }

  const items = mapFood99Items(input.payload);
  const itemsCount = items.reduce((a, i) => a + i.quantity, 0) || 1;
  const { subtotal, deliveryFee, total } = food99Totals(input.payload, items);

  const customerName = input.payload.customer?.name?.trim() || "Cliente 99Food";
  const customerPhone = food99CustomerPhone(input.payload);
  const neighborhood =
    input.payload.delivery?.deliveryAddress?.district?.trim() ||
    input.payload.delivery?.deliveryAddress?.neighborhood?.trim() ||
    null;
  const rawAddress = buildFood99Address(input.payload);

  const [storeRow] = await db
    .select({ lat: schema.stores.lat, lng: schema.stores.lng })
    .from(schema.stores)
    .where(eq(schema.stores.tenantId, input.tenantId))
    .limit(1);

  const [settingsRow] = await db
    .select()
    .from(schema.tenantMenuSettings)
    .where(eq(schema.tenantMenuSettings.tenantId, input.tenantId))
    .limit(1);

  const settings = settingsRow ? mapTenantMenuSettingsRow(settingsRow) : DEFAULT_MENU_SETTINGS;
  const coords = await resolveOrderCoordinates({
    address: rawAddress,
    neighborhood,
    cityRegion: settings.store_region,
    city: settings.store_city,
    state: settings.store_state,
    storeProximity:
      storeRow?.lat != null && storeRow?.lng != null
        ? { lat: storeRow.lat, lng: storeRow.lng }
        : null,
  });

  const navigationAddress = buildNavigationAddress({
    address: rawAddress,
    neighborhood,
    cityRegion: settings.store_region,
    city: settings.store_city,
    state: settings.store_state,
  });

  const fulfillmentType = input.payload.type?.toUpperCase() === "TAKEOUT" ? "pickup" : "delivery";
  const codeSuffix = extId.slice(-4);

  const [created] = await db
    .insert(schema.orders)
    .values({
      tenantId: input.tenantId,
      code: `#99${codeSuffix}`,
      status: "novo",
      customerName,
      customerPhone,
      address: coords.navigationAddress || navigationAddress,
      lat: coords.lat,
      lng: coords.lng,
      itemsCount,
      subtotalAmount: String(subtotal.toFixed(2)),
      deliveryFee: String(deliveryFee.toFixed(2)),
      discountAmount: "0",
      totalAmount: String(total.toFixed(2)),
      paymentMethod: "99food",
      fulfillmentType,
      neighborhood,
      channel: "99food",
      notes: `[99food:${extId}]`,
      slaMinutes: 45,
      paymentStatus: "pago",
    })
    .returning();

  for (const item of items) {
    await db.insert(schema.orderLineItems).values({
      orderId: created.id,
      menuItemId: null,
      name: item.name,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice.toFixed(2)),
      notes: null,
    });
  }

  await db.insert(schema.orderEvents).values({
    orderId: created.id,
    tenantId: input.tenantId,
    toStatus: "novo",
    note: `Importado do 99Food (${extId}) via ${input.source ?? "webhook"}`,
  });

  void notifyOrderStatusChange({
    orderId: created.id,
    tenantId: input.tenantId,
    fromStatus: null,
    toStatus: "novo",
  }).catch(() => {});

  logAutomationNewOrder(input.tenantId, created.id, created.code, created.customerName, "99Food");

  return { orderId: created.id };
}

export async function processFood99Event(input: {
  tenantId: string;
  event: Food99EventPayload;
  embeddedOrder?: Food99OrderPayload | null;
  source?: "webhook" | "polling";
}): Promise<{ orderId: string | null; ignored?: boolean }> {
  const code = eventType(input.event);
  if (!isPlaceEvent(code)) return { orderId: null, ignored: true };

  let orderPayload = input.embeddedOrder ?? null;
  if (!orderPayload) {
    const accessToken = await ensureFood99AccessToken(input.tenantId);
    if (!accessToken) throw new Error("99Food OAuth não conectado");

    const db = getDb();
    const [config] = await db
      .select({ apiBase: schema.food99TenantConfig.apiBase })
      .from(schema.food99TenantConfig)
      .where(eq(schema.food99TenantConfig.tenantId, input.tenantId))
      .limit(1);

    const orderId = String(input.event.orderId ?? input.event.order_id ?? "").trim();
    if (!orderId) return { orderId: null, ignored: true };

    orderPayload = await fetchFood99Order(accessToken, orderId, config?.apiBase);
  }

  const result = await processFood99Order({
    tenantId: input.tenantId,
    payload: orderPayload,
    source: input.source,
  });
  return result;
}

export function extractFood99EventFromWebhook(
  payload: Food99WebhookPayload,
): Food99EventPayload | null {
  const id = payload.id ?? payload.eventId;
  const orderId = payload.orderId ?? payload.order_id ?? payload.order?.id ?? payload.data?.id;
  const eventTypeValue = payload.eventType ?? payload.type ?? payload.code;
  if (!id || !orderId || !eventTypeValue) return null;
  return {
    id: String(id),
    orderId: String(orderId),
    eventType: String(eventTypeValue),
    merchantId: payload.merchantId ? String(payload.merchantId) : undefined,
  };
}

export function extractFood99MerchantId(
  payload: Food99WebhookPayload,
  event: Food99EventPayload | null,
): string | null {
  const raw = payload.merchantId ?? payload.merchant_id ?? event?.merchantId;
  return raw != null ? String(raw) : null;
}
