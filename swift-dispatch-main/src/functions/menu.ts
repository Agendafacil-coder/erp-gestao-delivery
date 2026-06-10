import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { assertCanManageMenu } from "@/lib/rbac";
import { upsertMenuItemForUser } from "@/lib/menu/menu-service";
import {
  DEFAULT_MENU_SETTINGS,
  mapTenantMenuSettingsRow,
  type TenantMenuSettingsDto,
} from "@/lib/menu/public-settings";
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

export type MenuCategoryDto = {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItemDto[];
};

export type MenuItemVariationDto = {
  id: string;
  name: string;
  price: number;
  sort_order: number;
};

export type MenuItemAddonDto = {
  id: string;
  name: string;
  price: number;
  group_name: string;
  required: boolean;
  max_quantity: number;
  is_suggested: boolean;
  sort_order: number;
};

export type MenuItemDto = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  sort_order: number;
  is_featured: boolean;
  is_combo: boolean;
  is_drink: boolean;
  sales_count: number;
  unit_cost: number | null;
  stock_quantity: number | null;
  stock_min: number;
  variations: MenuItemVariationDto[];
  addons: MenuItemAddonDto[];
};

function mapMenuItemRow(
  row: typeof schema.menuItems.$inferSelect,
  variations: MenuItemVariationDto[] = [],
  addons: MenuItemAddonDto[] = [],
): MenuItemDto {
  return {
    id: row.id,
    category_id: row.categoryId,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image_url: row.imageUrl,
    available: row.available,
    sort_order: row.sortOrder,
    is_featured: row.isFeatured ?? false,
    is_combo: row.isCombo ?? false,
    is_drink: row.isDrink ?? false,
    sales_count: row.salesCount ?? 0,
    unit_cost: row.unitCost != null ? Number(row.unitCost) : null,
    stock_quantity: row.stockQuantity ?? null,
    stock_min: row.stockMin ?? 0,
    variations,
    addons,
  };
}

export type PublicMenuPayload = {
  tenant: { id: string; name: string; slug: string };
  categories: MenuCategoryDto[];
  settings: TenantMenuSettingsDto;
  featured: MenuItemDto[];
  combos: MenuItemDto[];
  drinks: MenuItemDto[];
};

export const getPublicMenuFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantSlug: string }) => data)
  .handler(async ({ data }): Promise<PublicMenuPayload> => {
    const db = getDb();
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) throw new Error("Restaurante não encontrado");

    const categories = await db
      .select()
      .from(schema.menuCategories)
      .where(
        and(eq(schema.menuCategories.tenantId, tenant.id), eq(schema.menuCategories.active, true)),
      )
      .orderBy(asc(schema.menuCategories.sortOrder));

    const items = await db
      .select()
      .from(schema.menuItems)
      .where(and(eq(schema.menuItems.tenantId, tenant.id), eq(schema.menuItems.available, true)))
      .orderBy(asc(schema.menuItems.sortOrder));

    const itemIds = items.map((i) => i.id);

    const loadExtras = async () => {
      if (!itemIds.length) {
        return { variations: [] as (typeof schema.menuItemVariations.$inferSelect)[], addons: [] as (typeof schema.menuItemAddons.$inferSelect)[], settings: DEFAULT_MENU_SETTINGS };
      }
      try {
        const [variations, addons, settingsRow] = await Promise.all([
          db
            .select()
            .from(schema.menuItemVariations)
            .where(
              and(
                inArray(schema.menuItemVariations.menuItemId, itemIds),
                eq(schema.menuItemVariations.available, true),
              ),
            )
            .orderBy(asc(schema.menuItemVariations.sortOrder)),
          db
            .select()
            .from(schema.menuItemAddons)
            .where(
              and(
                inArray(schema.menuItemAddons.menuItemId, itemIds),
                eq(schema.menuItemAddons.available, true),
              ),
            )
            .orderBy(asc(schema.menuItemAddons.sortOrder)),
          db
            .select()
            .from(schema.tenantMenuSettings)
            .where(eq(schema.tenantMenuSettings.tenantId, tenant.id))
            .limit(1),
        ]);
        const settings: TenantMenuSettingsDto = settingsRow[0]
          ? mapTenantMenuSettingsRow(settingsRow[0])
          : DEFAULT_MENU_SETTINGS;
        return { variations, addons, settings };
      } catch {
        return {
          variations: [] as (typeof schema.menuItemVariations.$inferSelect)[],
          addons: [] as (typeof schema.menuItemAddons.$inferSelect)[],
          settings: DEFAULT_MENU_SETTINGS,
        };
      }
    };

    const { variations: allVariations, addons: allAddons, settings } = await loadExtras();

    const mapItem = (row: (typeof items)[0]) =>
      mapMenuItemRow(
        row,
        allVariations
          .filter((v) => v.menuItemId === row.id)
          .map((v) => ({
            id: v.id,
            name: v.name,
            price: Number(v.price),
            sort_order: v.sortOrder,
          })),
        allAddons
          .filter((a) => a.menuItemId === row.id)
          .map((a) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price),
            group_name: a.groupName ?? "Adicionais",
            required: a.required,
            max_quantity: a.maxQuantity,
            is_suggested: a.isSuggested,
            sort_order: a.sortOrder,
          })),
      );

    const mapped = items.map(mapItem);

    const featured = [...mapped]
      .filter((i) => i.is_featured)
      .sort((a, b) => b.sales_count - a.sales_count);
    const bestsellers =
      featured.length > 0
        ? featured
        : [...mapped].sort((a, b) => b.sales_count - a.sales_count).slice(0, 6);

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      settings,
      featured: bestsellers,
      combos: mapped.filter((i) => i.is_combo),
      drinks: mapped.filter((i) => i.is_drink),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sortOrder,
        items: mapped.filter((i) => i.category_id === c.id),
      })),
    };
  });

export const listMenuAdminFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<PublicMenuPayload> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, data.tenantId))
      .limit(1);

    if (!tenant) throw new Error("Tenant não encontrado");

    const categories = await db
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.tenantId, tenant.id))
      .orderBy(asc(schema.menuCategories.sortOrder));

    const items = await db
      .select()
      .from(schema.menuItems)
      .where(eq(schema.menuItems.tenantId, tenant.id))
      .orderBy(asc(schema.menuItems.sortOrder));

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      settings: DEFAULT_MENU_SETTINGS,
      featured: [],
      combos: [],
      drinks: [],
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sort_order: c.sortOrder,
        items: items
          .filter((i) => i.categoryId === c.id)
          .map((row) => mapMenuItemRow(row)),
      })),
    };
  });

export const upsertMenuCategoryFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; id?: string; name: string; sortOrder?: number }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    if (data.id) {
      const [row] = await db
        .update(schema.menuCategories)
        .set({ name: data.name, sortOrder: data.sortOrder ?? 0, updatedAt: new Date() })
        .where(eq(schema.menuCategories.id, data.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(schema.menuCategories)
      .values({
        tenantId: data.tenantId,
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();
    return row;
  });

export const upsertMenuItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      id?: string;
      categoryId: string;
      name: string;
      description?: string;
      price: number;
      imageUrl?: string | null;
      available?: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    return upsertMenuItemForUser(user, data);
  });

export const toggleMenuItemFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; itemId: string; available: boolean }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    await db
      .update(schema.menuItems)
      .set({ available: data.available, updatedAt: new Date() })
      .where(eq(schema.menuItems.id, data.itemId));
    return { ok: true };
  });

export const deleteMenuItemFn = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string; tenantId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    await db.delete(schema.menuItems).where(eq(schema.menuItems.id, data.itemId));
    return { ok: true };
  });

function toMenuItemDto(row: typeof schema.menuItems.$inferSelect): MenuItemDto {
  return mapMenuItemRow(row);
}

/** Reordena produtos dentro de uma categoria (nova API). */
export const reorderMenuItemsFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; categoryId: string; orderedItemIds: string[] }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    if (!data.orderedItemIds.length) return { ok: true as const };

    const db = getDb();
    const rows = await db
      .select({ id: schema.menuItems.id })
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.tenantId, data.tenantId),
          eq(schema.menuItems.categoryId, data.categoryId),
          inArray(schema.menuItems.id, data.orderedItemIds),
        ),
      );

    const allInCategory = await db
      .select({ id: schema.menuItems.id })
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.tenantId, data.tenantId),
          eq(schema.menuItems.categoryId, data.categoryId),
        ),
      );

    if (
      allInCategory.length !== data.orderedItemIds.length ||
      allInCategory.some((r) => !data.orderedItemIds.includes(r.id))
    ) {
      throw new Error("Informe todos os produtos da categoria na nova ordem");
    }

    await Promise.all(
      data.orderedItemIds.map((id, index) =>
        db
          .update(schema.menuItems)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(schema.menuItems.id, id)),
      ),
    );

    return { ok: true as const };
  });

/** Atualização parcial — não altera upsertMenuItemFn. */
export const patchMenuItemFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      itemId: string;
      price?: number;
      categoryId?: string;
      available?: boolean;
    }) => data,
  )
  .handler(async ({ data }): Promise<MenuItemDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.menuItems)
      .where(
        and(eq(schema.menuItems.id, data.itemId), eq(schema.menuItems.tenantId, data.tenantId)),
      )
      .limit(1);

    if (!existing) throw new Error("Produto não encontrado");

    if (data.categoryId) {
      const [cat] = await db
        .select({ id: schema.menuCategories.id })
        .from(schema.menuCategories)
        .where(
          and(
            eq(schema.menuCategories.id, data.categoryId),
            eq(schema.menuCategories.tenantId, data.tenantId),
          ),
        )
        .limit(1);
      if (!cat) throw new Error("Categoria inválida");
    }

    const patch: Partial<typeof schema.menuItems.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (data.price !== undefined) patch.price = String(data.price);
    if (data.categoryId !== undefined) patch.categoryId = data.categoryId;
    if (data.available !== undefined) patch.available = data.available;

    const [row] = await db
      .update(schema.menuItems)
      .set(patch)
      .where(eq(schema.menuItems.id, data.itemId))
      .returning();

    if (!row) throw new Error("Falha ao atualizar produto");
    return toMenuItemDto(row);
  });

export const duplicateMenuItemFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; itemId: string }) => data)
  .handler(async ({ data }): Promise<MenuItemDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    const [source] = await db
      .select()
      .from(schema.menuItems)
      .where(
        and(eq(schema.menuItems.id, data.itemId), eq(schema.menuItems.tenantId, data.tenantId)),
      )
      .limit(1);

    if (!source) throw new Error("Produto não encontrado");

    const siblings = await db
      .select({ sortOrder: schema.menuItems.sortOrder })
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.tenantId, data.tenantId),
          eq(schema.menuItems.categoryId, source.categoryId),
        ),
      );
    const nextSort =
      siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

    const [row] = await db
      .insert(schema.menuItems)
      .values({
        tenantId: source.tenantId,
        categoryId: source.categoryId,
        name: `${source.name} (cópia)`,
        description: source.description,
        price: source.price,
        imageUrl: source.imageUrl,
        available: false,
        sortOrder: nextSort,
      })
      .returning();

    return toMenuItemDto(row);
  });
