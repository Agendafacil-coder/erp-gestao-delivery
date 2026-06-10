import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  DEFAULT_MENU_SETTINGS,
  mapTenantMenuSettingsRow,
  type TenantMenuSettingsDto,
} from "@/lib/menu/public-settings";
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
