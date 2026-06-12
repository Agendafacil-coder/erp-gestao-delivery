import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { mapTenantMenuSettingsRow, DEFAULT_MENU_SETTINGS } from "@/lib/menu/public-settings";
import { resolveOrderCoordinates } from "@/lib/geo/geocode";

const ACTIVE_STATUSES = [
  "novo",
  "confirmado",
  "em_preparo",
  "pronto",
  "aguardando_entregador",
  "em_rota_entrega",
] as const;

/** Preenche lat/lng de pedidos de entrega sem coordenadas (silencioso, limitado). */
export async function backfillMissingOrderGeocodes(
  tenantId: string,
  limit = 5,
): Promise<number> {
  const db = getDb();

  const pending = await db
    .select({
      id: schema.orders.id,
      address: schema.orders.address,
      neighborhood: schema.orders.neighborhood,
      postalCode: schema.orders.postalCode,
    })
    .from(schema.orders)
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        inArray(schema.orders.status, [...ACTIVE_STATUSES]),
        or(isNull(schema.orders.lat), isNull(schema.orders.lng)),
        eq(schema.orders.fulfillmentType, "delivery"),
      ),
    )
    .limit(limit);

  if (pending.length === 0) return 0;

  const [storeRow] = await db
    .select({ lat: schema.stores.lat, lng: schema.stores.lng })
    .from(schema.stores)
    .where(eq(schema.stores.tenantId, tenantId))
    .limit(1);

  const [settingsRow] = await db
    .select()
    .from(schema.tenantMenuSettings)
    .where(eq(schema.tenantMenuSettings.tenantId, tenantId))
    .limit(1);

  const settings = settingsRow ? mapTenantMenuSettingsRow(settingsRow) : DEFAULT_MENU_SETTINGS;
  const storeProximity =
    storeRow?.lat != null && storeRow?.lng != null
      ? { lat: storeRow.lat, lng: storeRow.lng }
      : null;

  let updated = 0;

  for (const order of pending) {
    const coords = await resolveOrderCoordinates({
      address: order.address,
      neighborhood: order.neighborhood,
      postalCode: order.postalCode,
      cityRegion: settings.store_region,
      city: settings.store_city,
      state: settings.store_state,
      storeProximity,
    });

    if (coords.lat == null || coords.lng == null) continue;

    await db
      .update(schema.orders)
      .set({
        lat: coords.lat,
        lng: coords.lng,
        address: coords.navigationAddress,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.orders.id, order.id), eq(schema.orders.tenantId, tenantId)));

    updated += 1;
  }

  return updated;
}
