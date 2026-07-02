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
import { takeRappiOrder, rappiExternalOrderId } from "./ordersClient";
import type { RappiOrderPayload, RappiWebhookPayload } from "./types";

const RAPPI_NOTE_RE = /\[rappi:([^\]]+)\]/i;

export function verifyRappiSignature(
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

export async function resolveRappiTenant(storeId: string | null): Promise<string | null> {
  if (!storeId?.trim()) return null;
  const db = getDb();
  const [row] = await db
    .select({ tenantId: schema.rappiTenantConfig.tenantId })
    .from(schema.rappiTenantConfig)
    .where(
      and(
        eq(schema.rappiTenantConfig.storeId, storeId.trim()),
        eq(schema.rappiTenantConfig.enabled, true),
      ),
    )
    .limit(1);
  return row?.tenantId ?? null;
}

async function findLocalOrderByRappiExtId(tenantId: string, extId: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ id: schema.orders.id, notes: schema.orders.notes })
    .from(schema.orders)
    .where(and(eq(schema.orders.tenantId, tenantId), eq(schema.orders.channel, "rappi")));

  for (const row of rows) {
    if (row.notes?.includes(`[rappi:${extId}]`)) return row.id;
    const match = row.notes?.match(RAPPI_NOTE_RE);
    if (match?.[1] === extId) return row.id;
  }
  return null;
}

function mapRappiItems(payload: RappiOrderPayload) {
  const raw = payload.order_details ?? payload.items ?? [];
  return raw.map((item) => ({
    name: item.name?.trim() || "Item Rappi",
    quantity: item.quantity ?? 1,
    unitPrice: Number(item.unit_price ?? item.price ?? 0),
  }));
}

function buildRappiAddress(payload: RappiOrderPayload): string {
  const d = payload.delivery;
  const parts = [d?.address, d?.neighborhood, d?.complement].filter(Boolean);
  return parts.join(", ") || "Endereço Rappi";
}

function payloadSubtotal(payload: RappiOrderPayload): number | null {
  const fromTotals = payload.totals?.subtotal;
  if (fromTotals != null) return Number(fromTotals);
  return null;
}

export async function processRappiOrder(input: {
  tenantId: string;
  payload: RappiOrderPayload;
  source?: "webhook" | "polling";
}): Promise<{ orderId: string | null }> {
  if (!(await isTenantFeatureEnabled(input.tenantId, "marketplace_rappi"))) {
    throw new Error("Integração Rappi desativada para este tenant");
  }

  const extId = rappiExternalOrderId(input.payload);
  if (!extId) return { orderId: null };

  const existing = await findLocalOrderByRappiExtId(input.tenantId, extId);
  if (existing) return { orderId: existing };

  const db = getDb();
  const [config] = await db
    .select()
    .from(schema.rappiTenantConfig)
    .where(eq(schema.rappiTenantConfig.tenantId, input.tenantId))
    .limit(1);

  if (!config?.enabled || !config.storeId?.trim()) {
    throw new Error("Integração Rappi não configurada");
  }

  const items = mapRappiItems(input.payload);
  const itemsCount = items.reduce((a, i) => a + i.quantity, 0) || 1;
  const subtotal =
    payloadSubtotal(input.payload) ?? items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
  const deliveryFee = Number(input.payload.delivery_fee ?? input.payload.totals?.delivery_fee ?? 0);
  const total = Number(
    input.payload.total ?? input.payload.totals?.total ?? subtotal + deliveryFee,
  );

  const customerName =
    [input.payload.customer?.first_name, input.payload.customer?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Cliente Rappi";
  const customerPhone =
    input.payload.customer?.phone?.trim() || input.payload.customer?.phone_number?.trim() || null;

  const neighborhood = input.payload.delivery?.neighborhood?.trim() || null;
  const rawAddress = buildRappiAddress(input.payload);

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

  const codeSuffix = extId.slice(-4);
  const [created] = await db
    .insert(schema.orders)
    .values({
      tenantId: input.tenantId,
      code: `#RP${codeSuffix}`,
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
      paymentMethod: "rappi",
      fulfillmentType: "delivery",
      neighborhood,
      channel: "rappi",
      notes: `[rappi:${extId}]`,
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
    note: `Importado do Rappi (${extId}) via ${input.source ?? "webhook"}`,
  });

  void notifyOrderStatusChange({
    orderId: created.id,
    tenantId: input.tenantId,
    fromStatus: null,
    toStatus: "novo",
  }).catch(() => {});

  logAutomationNewOrder(input.tenantId, created.id, created.code, created.customerName, "Rappi");

  void takeRappiOrder(config.storeId, extId).catch((err) => {
    console.error("[rappi] take order failed:", err instanceof Error ? err.message : err);
  });

  return { orderId: created.id };
}

export function extractRappiOrderFromWebhook(
  payload: RappiWebhookPayload,
): RappiOrderPayload | null {
  if (payload.order) return payload.order;
  if (payload.order_id != null) {
    return { order_id: payload.order_id, store_id: payload.store_id };
  }
  return null;
}

export function extractRappiStoreId(
  payload: RappiWebhookPayload,
  order: RappiOrderPayload | null,
): string | null {
  const raw = payload.store_id ?? order?.store_id;
  return raw != null ? String(raw) : null;
}
