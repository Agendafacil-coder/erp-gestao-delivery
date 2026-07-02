import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanManageMenu } from "@/lib/rbac";
import { loadMenuItemExtras, upsertMenuItemForUser } from "@/lib/menu/menu-service";
import { parseMenuImportCsv } from "@/lib/menu/menu-import";
import {
  DEFAULT_MENU_SETTINGS,
  mapTenantMenuSettingsRow,
  normalizeMenuLayout,
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

async function loadTenantMenuSettings(tenantId: string): Promise<TenantMenuSettingsDto> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.tenantMenuSettings)
    .where(eq(schema.tenantMenuSettings.tenantId, tenantId))
    .limit(1);
  return row ? mapTenantMenuSettingsRow(row) : DEFAULT_MENU_SETTINGS;
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

function mapVariationRow(v: typeof schema.menuItemVariations.$inferSelect): MenuItemVariationDto {
  return {
    id: v.id,
    name: v.name,
    price: Number(v.price),
    sort_order: v.sortOrder,
  };
}

function mapAddonRow(a: typeof schema.menuItemAddons.$inferSelect): MenuItemAddonDto {
  return {
    id: a.id,
    name: a.name,
    price: Number(a.price),
    group_name: a.groupName ?? "Adicionais",
    required: a.required,
    max_quantity: a.maxQuantity,
    is_suggested: a.isSuggested,
    sort_order: a.sortOrder,
  };
}

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

    const items = (
      await db
        .select()
        .from(schema.menuItems)
        .where(and(eq(schema.menuItems.tenantId, tenant.id), eq(schema.menuItems.available, true)))
        .orderBy(asc(schema.menuItems.sortOrder))
    ).filter((i) => i.stockQuantity == null || i.stockQuantity > 0);

    const itemIds = items.map((i) => i.id);
    const settings = await loadTenantMenuSettings(tenant.id);

    const loadItemExtras = async () => {
      if (!itemIds.length) {
        return {
          variations: [] as (typeof schema.menuItemVariations.$inferSelect)[],
          addons: [] as (typeof schema.menuItemAddons.$inferSelect)[],
        };
      }
      try {
        const [variations, addons] = await Promise.all([
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
        ]);
        return { variations, addons };
      } catch (e) {
        console.error("getPublicMenuFn: falha ao carregar variações/adicionais", e);
        return {
          variations: [] as (typeof schema.menuItemVariations.$inferSelect)[],
          addons: [] as (typeof schema.menuItemAddons.$inferSelect)[],
        };
      }
    };

    const { variations: allVariations, addons: allAddons } = await loadItemExtras();

    const mapItem = (row: (typeof items)[0]) =>
      mapMenuItemRow(
        row,
        allVariations.filter((v) => v.menuItemId === row.id).map(mapVariationRow),
        allAddons.filter((a) => a.menuItemId === row.id).map(mapAddonRow),
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

    const itemIds = items.map((i) => i.id);
    const { variations: allVariations, addons: allAddons } = await loadMenuItemExtras(itemIds);

    const mapItem = (row: (typeof items)[0]) =>
      mapMenuItemRow(
        row,
        allVariations.filter((v) => v.menuItemId === row.id).map(mapVariationRow),
        allAddons.filter((a) => a.menuItemId === row.id).map(mapAddonRow),
      );

    const mapped = items.map(mapItem);

    const settings = await loadTenantMenuSettings(tenant.id);

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      settings,
      featured: mapped.filter((i) => i.is_featured),
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
      stockQuantity?: number | null;
      stockMin?: number;
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
    if (data.stockQuantity !== undefined) {
      patch.stockQuantity =
        data.stockQuantity != null ? Math.max(0, Math.round(data.stockQuantity)) : null;
    }
    if (data.stockMin !== undefined) {
      patch.stockMin = Math.max(0, Math.round(data.stockMin));
    }

    const [row] = await db
      .update(schema.menuItems)
      .set(patch)
      .where(eq(schema.menuItems.id, data.itemId))
      .returning();

    if (!row) throw new Error("Falha ao atualizar produto");

    if (data.stockQuantity !== undefined || data.stockMin !== undefined) {
      const { syncMenuItemAvailabilityFromStock } =
        await import("@/lib/menu/menu-stock-availability.server");
      await syncMenuItemAvailabilityFromStock(db, data.tenantId, data.itemId, {
        allowUnpause: true,
      });
      const [synced] = await db
        .select()
        .from(schema.menuItems)
        .where(eq(schema.menuItems.id, data.itemId))
        .limit(1);
      if (synced) {
        const { mapMenuItemDtoFromRow } = await import("@/lib/menu/menu-mappers.server");
        return await mapMenuItemDtoFromRow(synced);
      }
    }

    const { mapMenuItemDtoFromRow } = await import("@/lib/menu/menu-mappers.server");
    return await mapMenuItemDtoFromRow(row);
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
    const nextSort = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

    const { variations: sourceVariations, addons: sourceAddons } = await loadMenuItemExtras([
      source.id,
    ]);

    const [row] = await db
      .insert(schema.menuItems)
      .values({
        tenantId: source.tenantId,
        categoryId: source.categoryId,
        name: `${source.name} (cópia)`,
        description: source.description,
        price: source.price,
        unitCost: source.unitCost,
        stockQuantity: source.stockQuantity,
        stockMin: source.stockMin,
        imageUrl: source.imageUrl,
        available: false,
        sortOrder: nextSort,
        isFeatured: source.isFeatured,
        isCombo: source.isCombo,
        isDrink: source.isDrink,
      })
      .returning();

    if (sourceVariations.length > 0) {
      await db.insert(schema.menuItemVariations).values(
        sourceVariations.map((v, index) => ({
          menuItemId: row.id,
          name: v.name,
          price: v.price,
          sortOrder: index,
        })),
      );
    }
    if (sourceAddons.length > 0) {
      await db.insert(schema.menuItemAddons).values(
        sourceAddons.map((a, index) => ({
          menuItemId: row.id,
          name: a.name,
          price: a.price,
          groupName: a.groupName,
          required: a.required,
          maxQuantity: a.maxQuantity,
          isSuggested: a.isSuggested,
          sortOrder: index,
        })),
      );
    }

    const { mapMenuItemDtoFromRow } = await import("@/lib/menu/menu-mappers.server");
    return await mapMenuItemDtoFromRow(row);
  });

export const deleteMenuCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; categoryId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
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
    if (!cat) throw new Error("Categoria não encontrada");

    const items = await db
      .select({ id: schema.menuItems.id })
      .from(schema.menuItems)
      .where(eq(schema.menuItems.categoryId, data.categoryId));
    if (items.length > 0) {
      throw new Error("Remova ou mova os produtos desta categoria antes de excluí-la");
    }

    await db.delete(schema.menuCategories).where(eq(schema.menuCategories.id, data.categoryId));
    return { ok: true as const };
  });

export const duplicateMenuCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; categoryId: string }) => data)
  .handler(async ({ data }): Promise<{ categoryId: string; itemsCopied: number }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    const [sourceCat] = await db
      .select()
      .from(schema.menuCategories)
      .where(
        and(
          eq(schema.menuCategories.id, data.categoryId),
          eq(schema.menuCategories.tenantId, data.tenantId),
        ),
      )
      .limit(1);
    if (!sourceCat) throw new Error("Categoria não encontrada");

    const allCats = await db
      .select({ sortOrder: schema.menuCategories.sortOrder })
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.tenantId, data.tenantId));
    const nextCatSort = allCats.length > 0 ? Math.max(...allCats.map((c) => c.sortOrder)) + 1 : 0;

    const [newCat] = await db
      .insert(schema.menuCategories)
      .values({
        tenantId: data.tenantId,
        name: `${sourceCat.name} (cópia)`,
        sortOrder: nextCatSort,
        active: sourceCat.active,
      })
      .returning();

    const sourceItems = await db
      .select()
      .from(schema.menuItems)
      .where(
        and(
          eq(schema.menuItems.tenantId, data.tenantId),
          eq(schema.menuItems.categoryId, data.categoryId),
        ),
      )
      .orderBy(asc(schema.menuItems.sortOrder));

    if (!sourceItems.length) {
      return { categoryId: newCat.id, itemsCopied: 0 };
    }

    const itemIds = sourceItems.map((i) => i.id);
    const { variations, addons } = await loadMenuItemExtras(itemIds);
    const variationsByItem = new Map<string, typeof variations>();
    const addonsByItem = new Map<string, typeof addons>();
    for (const v of variations) {
      const list = variationsByItem.get(v.menuItemId) ?? [];
      list.push(v);
      variationsByItem.set(v.menuItemId, list);
    }
    for (const a of addons) {
      const list = addonsByItem.get(a.menuItemId) ?? [];
      list.push(a);
      addonsByItem.set(a.menuItemId, list);
    }

    let itemsCopied = 0;
    for (const source of sourceItems) {
      const [row] = await db
        .insert(schema.menuItems)
        .values({
          tenantId: source.tenantId,
          categoryId: newCat.id,
          name: source.name,
          description: source.description,
          price: source.price,
          unitCost: source.unitCost,
          stockQuantity: source.stockQuantity,
          stockMin: source.stockMin,
          imageUrl: source.imageUrl,
          available: false,
          sortOrder: source.sortOrder,
          isFeatured: source.isFeatured,
          isCombo: source.isCombo,
          isDrink: source.isDrink,
        })
        .returning();

      const sourceVariations = variationsByItem.get(source.id) ?? [];
      if (sourceVariations.length > 0) {
        await db.insert(schema.menuItemVariations).values(
          sourceVariations.map((v, index) => ({
            menuItemId: row.id,
            name: v.name,
            price: v.price,
            sortOrder: index,
          })),
        );
      }
      const sourceAddons = addonsByItem.get(source.id) ?? [];
      if (sourceAddons.length > 0) {
        await db.insert(schema.menuItemAddons).values(
          sourceAddons.map((a, index) => ({
            menuItemId: row.id,
            name: a.name,
            price: a.price,
            groupName: a.groupName,
            required: a.required,
            maxQuantity: a.maxQuantity,
            isSuggested: a.isSuggested,
            sortOrder: index,
          })),
        );
      }
      itemsCopied += 1;
    }

    return { categoryId: newCat.id, itemsCopied };
  });

export const reorderMenuCategoriesFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; orderedCategoryIds: string[] }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    if (!data.orderedCategoryIds.length) return { ok: true as const };

    const db = getDb();
    const rows = await db
      .select({ id: schema.menuCategories.id })
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.tenantId, data.tenantId));

    if (
      rows.length !== data.orderedCategoryIds.length ||
      rows.some((r) => !data.orderedCategoryIds.includes(r.id))
    ) {
      throw new Error("Informe todas as categorias na nova ordem");
    }

    await Promise.all(
      data.orderedCategoryIds.map((id, index) =>
        db
          .update(schema.menuCategories)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(schema.menuCategories.id, id)),
      ),
    );

    return { ok: true as const };
  });

export type MenuImportResult = {
  created: MenuItemDto[];
  categoriesCreated: number;
  errors: string[];
};

export const importMenuItemsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; csv: string }) => data)
  .handler(async ({ data }): Promise<MenuImportResult> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const { rows, errors: parseErrors } = parseMenuImportCsv(data.csv);
    if (!rows.length) {
      throw new Error(parseErrors.join(" ") || "Nenhuma linha válida no CSV.");
    }

    const db = getDb();
    const categories = await db
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.tenantId, data.tenantId));

    const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));
    let categoriesCreated = 0;
    const created: MenuItemDto[] = [];
    const errors = [...parseErrors];
    const { mapMenuItemDtoFromRow } = await import("@/lib/menu/menu-mappers.server");

    for (const row of rows) {
      try {
        const key = row.categoryName.trim().toLowerCase();
        let cat = categoryByName.get(key);
        if (!cat) {
          const [newCat] = await db
            .insert(schema.menuCategories)
            .values({
              tenantId: data.tenantId,
              name: row.categoryName.trim(),
              sortOrder: categories.length + categoriesCreated,
            })
            .returning();
          cat = newCat;
          categoryByName.set(key, cat);
          categoriesCreated += 1;
        }

        const inserted = await upsertMenuItemForUser(user, {
          tenantId: data.tenantId,
          categoryId: cat.id,
          name: row.name,
          description: row.description,
          price: row.price,
          stockQuantity: row.stockQuantity ?? null,
          stockMin: row.stockMin ?? 0,
          isFeatured: row.isFeatured ?? false,
          isCombo: row.isCombo ?? false,
          isDrink: row.isDrink ?? false,
          available: row.available ?? true,
        });
        created.push(await mapMenuItemDtoFromRow(inserted));
      } catch (e) {
        errors.push(`${row.name}: ${(e as Error).message}`);
      }
    }

    if (!created.length) {
      throw new Error(errors.join(" ") || "Nenhum produto importado.");
    }

    return { created, categoriesCreated, errors };
  });

export const updateMenuBrandingFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      menuLogoUrl?: string | null;
      menuCoverUrl?: string | null;
      menuLayout?: string | null;
    }) => data,
  )
  .handler(async ({ data }): Promise<TenantMenuSettingsDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const normalizeUrl = (url: string | null | undefined) => {
      if (url === undefined) return undefined;
      const trimmed = url?.trim() ?? "";
      return trimmed || null;
    };

    const patch: {
      menuLogoUrl?: string | null;
      menuCoverUrl?: string | null;
      menuLayout?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    const logo = normalizeUrl(data.menuLogoUrl);
    const cover = normalizeUrl(data.menuCoverUrl);
    if (logo !== undefined) patch.menuLogoUrl = logo;
    if (cover !== undefined) patch.menuCoverUrl = cover;
    if (data.menuLayout !== undefined) {
      patch.menuLayout = normalizeMenuLayout(data.menuLayout);
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    if (existing) {
      const [row] = await db
        .update(schema.tenantMenuSettings)
        .set(patch)
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
        .returning();
      return mapTenantMenuSettingsRow(row);
    }

    const [row] = await db
      .insert(schema.tenantMenuSettings)
      .values({
        tenantId: data.tenantId,
        menuLogoUrl: logo ?? null,
        menuCoverUrl: cover ?? null,
      })
      .returning();
    return mapTenantMenuSettingsRow(row);
  });

export const backfillMenuImagesFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);

    const db = getDb();
    const { backfillMissingMenuImages } = await import("@/lib/menu/menu-images.server");
    return backfillMissingMenuImages(db, data.tenantId);
  });
