import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  DEFAULT_MENU_SETTINGS,
  mapTenantMenuSettingsRow,
  normalizeCoupons,
  type MenuCoupon,
  type NeighborhoodFee,
  type StoreOpeningHours,
  type TenantMenuSettingsDto,
} from "@/lib/menu/public-settings";
import {
  normalizeOpeningHours,
  parseTimeHHmm,
  STORE_DAY_LABELS,
  STORE_DAY_ORDER,
} from "@/lib/menu/store-hours";
import { assertCanManageMenu } from "@/lib/rbac";
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

export const getStoreSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<TenantMenuSettingsDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    return row ? mapTenantMenuSettingsRow(row) : DEFAULT_MENU_SETTINGS;
  });

export type UpdateStoreRegionInput = {
  tenantId: string;
  store_address?: string | null;
  store_city: string;
  store_state: string;
  store_postal_code?: string | null;
};

export const updateStoreRegionFn = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateStoreRegionInput) => data)
  .handler(async ({ data }): Promise<TenantMenuSettingsDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const city = data.store_city.trim();
    const state = data.store_state.trim().toUpperCase();
    if (!city) throw new Error("Informe a cidade da loja");
    if (!state || state.length !== 2) throw new Error("Informe a UF com 2 letras (ex.: SP)");

    const postalCode = data.store_postal_code?.trim().replace(/\D/g, "") || null;
    if (postalCode && postalCode.length !== 8) {
      throw new Error("CEP deve ter 8 dígitos");
    }

    const db = getDb();
    const patch = {
      storeAddress: data.store_address?.trim() || null,
      storeCity: city,
      storeState: state,
      storePostalCode: postalCode,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(schema.tenantMenuSettings)
        .set(patch)
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
        .returning();
    } else {
      [row] = await db
        .insert(schema.tenantMenuSettings)
        .values({
          tenantId: data.tenantId,
          ...patch,
        })
        .returning();
    }

    return mapTenantMenuSettingsRow(row);
  });

export type UpdateStoreHoursInput = {
  tenantId: string;
  opening_hours: StoreOpeningHours;
};

export const updateStoreHoursFn = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateStoreHoursInput) => data)
  .handler(async ({ data }): Promise<TenantMenuSettingsDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const hours = normalizeOpeningHours(data.opening_hours);
    if (hours.enabled) {
      for (const dayIndex of STORE_DAY_ORDER) {
        const day = hours.days[dayIndex];
        const label = STORE_DAY_LABELS[dayIndex];
        if (day.closed) continue;
        if (parseTimeHHmm(day.open) == null) {
          throw new Error(`Horário inválido: ${label} abertura (use HH:mm)`);
        }
        if (parseTimeHHmm(day.close) == null) {
          throw new Error(`Horário inválido: ${label} fechamento (use HH:mm)`);
        }
      }
    }

    const db = getDb();
    const patch = {
      openingHours: JSON.stringify(hours),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(schema.tenantMenuSettings)
        .set(patch)
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
        .returning();
    } else {
      [row] = await db
        .insert(schema.tenantMenuSettings)
        .values({
          tenantId: data.tenantId,
          ...patch,
        })
        .returning();
    }

    return mapTenantMenuSettingsRow(row);
  });

export type UpdateStoreDeliveryFeesInput = {
  tenantId: string;
  default_delivery_fee: number;
  neighborhood_fees: NeighborhoodFee[];
};

export const updateStoreDeliveryFeesFn = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateStoreDeliveryFeesInput) => data)
  .handler(async ({ data }): Promise<TenantMenuSettingsDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const defaultFee = Number(data.default_delivery_fee);
    if (!Number.isFinite(defaultFee) || defaultFee < 0) {
      throw new Error("Taxa padrão de entrega inválida");
    }

    const neighborhoodFees = data.neighborhood_fees
      .map((n) => ({
        name: n.name.trim(),
        fee: Number(n.fee),
      }))
      .filter((n) => n.name.length > 0);

    for (const row of neighborhoodFees) {
      if (!Number.isFinite(row.fee) || row.fee < 0) {
        throw new Error(`Taxa inválida para o bairro "${row.name}"`);
      }
    }

    const names = neighborhoodFees.map((n) => n.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new Error("Não repita o mesmo bairro na lista de taxas");
    }

    const db = getDb();
    const patch = {
      defaultDeliveryFee: String(defaultFee.toFixed(2)),
      neighborhoodFees: JSON.stringify(neighborhoodFees),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(schema.tenantMenuSettings)
        .set(patch)
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
        .returning();
    } else {
      [row] = await db
        .insert(schema.tenantMenuSettings)
        .values({
          tenantId: data.tenantId,
          ...patch,
        })
        .returning();
    }

    return mapTenantMenuSettingsRow(row);
  });

export type UpdateStoreFulfillmentInput = {
  tenantId: string;
  delivery_enabled: boolean;
  pickup_enabled: boolean;
};

export const updateStoreFulfillmentFn = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateStoreFulfillmentInput) => data)
  .handler(async ({ data }): Promise<TenantMenuSettingsDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    if (!data.delivery_enabled && !data.pickup_enabled) {
      throw new Error("Ative entrega ou retirada — pelo menos uma forma de pedido deve estar disponível");
    }

    const db = getDb();
    const patch = {
      deliveryEnabled: data.delivery_enabled,
      pickupEnabled: data.pickup_enabled,
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(schema.tenantMenuSettings)
        .set(patch)
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
        .returning();
    } else {
      [row] = await db
        .insert(schema.tenantMenuSettings)
        .values({
          tenantId: data.tenantId,
          ...patch,
        })
        .returning();
    }

    return mapTenantMenuSettingsRow(row);
  });

export type UpdateStoreCouponsInput = {
  tenantId: string;
  coupons: MenuCoupon[];
};

export const updateStoreCouponsFn = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateStoreCouponsInput) => data)
  .handler(async ({ data }): Promise<TenantMenuSettingsDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const coupons = normalizeCoupons(data.coupons);

    const db = getDb();
    const patch = {
      coupons: JSON.stringify(coupons),
      updatedAt: new Date(),
    };

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    let row;
    if (existing) {
      [row] = await db
        .update(schema.tenantMenuSettings)
        .set(patch)
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
        .returning();
    } else {
      [row] = await db
        .insert(schema.tenantMenuSettings)
        .values({
          tenantId: data.tenantId,
          ...patch,
        })
        .returning();
    }

    return mapTenantMenuSettingsRow(row);
  });
