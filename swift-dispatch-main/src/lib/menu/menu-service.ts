import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanManageMenu } from "@/lib/rbac";
import type { SessionUser } from "@/functions/session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export type MenuVariationInput = {
  name: string;
  price: number;
};

export type MenuAddonInput = {
  name: string;
  price: number;
  groupName?: string;
  required?: boolean;
  maxQuantity?: number;
  isSuggested?: boolean;
};

export type UpsertMenuItemInput = {
  tenantId: string;
  id?: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  unitCost?: number | null;
  /** null = estoque não controlado */
  stockQuantity?: number | null;
  stockMin?: number;
  imageUrl?: string | null;
  available?: boolean;
  isFeatured?: boolean;
  isCombo?: boolean;
  isDrink?: boolean;
  /** ID do item no catálogo iFood */
  ifoodItemId?: string | null;
  variations?: MenuVariationInput[];
  addons?: MenuAddonInput[];
};

async function replaceItemExtras(
  menuItemId: string,
  variations: MenuVariationInput[],
  addons: MenuAddonInput[],
) {
  const db = getDb();
  await db.delete(schema.menuItemVariations).where(eq(schema.menuItemVariations.menuItemId, menuItemId));
  await db.delete(schema.menuItemAddons).where(eq(schema.menuItemAddons.menuItemId, menuItemId));

  if (variations.length > 0) {
    await db.insert(schema.menuItemVariations).values(
      variations.map((v, index) => ({
        menuItemId,
        name: v.name.trim(),
        price: String(v.price),
        sortOrder: index,
      })),
    );
  }

  if (addons.length > 0) {
    await db.insert(schema.menuItemAddons).values(
      addons.map((a, index) => ({
        menuItemId,
        name: a.name.trim(),
        price: String(a.price),
        groupName: a.groupName?.trim() || "Adicionais",
        required: a.required ?? false,
        maxQuantity: Math.max(1, a.maxQuantity ?? 1),
        isSuggested: a.isSuggested ?? false,
        sortOrder: index,
      })),
    );
  }
}

export async function upsertMenuItemForUser(user: SessionUser, data: UpsertMenuItemInput) {
  await assertTenantAccess(user.id, data.tenantId);
  assertCanManageMenu(user, data.tenantId);

  const db = getDb();
  const baseValues = {
    tenantId: data.tenantId,
    categoryId: data.categoryId,
    name: data.name,
    description: data.description ?? null,
    price: String(data.price),
    unitCost:
      data.unitCost != null && !Number.isNaN(data.unitCost)
        ? String(data.unitCost)
        : null,
    stockQuantity:
      data.stockQuantity != null && !Number.isNaN(data.stockQuantity)
        ? Math.max(0, Math.round(data.stockQuantity))
        : null,
    stockMin:
      data.stockMin != null && !Number.isNaN(data.stockMin)
        ? Math.max(0, Math.round(data.stockMin))
        : 0,
    imageUrl: data.imageUrl ?? null,
    available: data.available ?? true,
    isFeatured: data.isFeatured ?? false,
    isCombo: data.isCombo ?? false,
    isDrink: data.isDrink ?? false,
    updatedAt: new Date(),
  };

  const values =
    data.ifoodItemId !== undefined
      ? { ...baseValues, ifoodItemId: data.ifoodItemId?.trim() || null }
      : baseValues;

  const variations = data.variations ?? [];
  const addons = data.addons ?? [];

  if (data.id) {
    const [row] = await db
      .update(schema.menuItems)
      .set(values)
      .where(eq(schema.menuItems.id, data.id))
      .returning();
    if (!row) throw new Error("Produto não encontrado");
    await replaceItemExtras(row.id, variations, addons);
    return row;
  }

  const siblings = await db
    .select({ sortOrder: schema.menuItems.sortOrder })
    .from(schema.menuItems)
    .where(
      and(
        eq(schema.menuItems.tenantId, data.tenantId),
        eq(schema.menuItems.categoryId, data.categoryId),
      ),
    );
  const nextSort =
    siblings.length > 0 ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

  const [row] = await db
    .insert(schema.menuItems)
    .values({
      ...values,
      ifoodItemId: data.ifoodItemId?.trim() || null,
      sortOrder: nextSort,
    })
    .returning();
  await replaceItemExtras(row.id, variations, addons);
  return row;
}

export async function loadMenuItemExtras(itemIds: string[]) {
  if (!itemIds.length) {
    return {
      variations: [] as (typeof schema.menuItemVariations.$inferSelect)[],
      addons: [] as (typeof schema.menuItemAddons.$inferSelect)[],
    };
  }
  const db = getDb();
  const [variations, addons] = await Promise.all([
    db
      .select()
      .from(schema.menuItemVariations)
      .where(inArray(schema.menuItemVariations.menuItemId, itemIds))
      .orderBy(schema.menuItemVariations.sortOrder),
    db
      .select()
      .from(schema.menuItemAddons)
      .where(inArray(schema.menuItemAddons.menuItemId, itemIds))
      .orderBy(schema.menuItemAddons.sortOrder),
  ]);
  return { variations, addons };
}
