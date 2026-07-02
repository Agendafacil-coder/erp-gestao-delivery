import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanManageMenu, assertCanAccessFinance } from "@/lib/rbac";
import { loadRecipeUnitCosts } from "@/lib/menu/recipe-cost.server";
import {
  assertTenantFeatureEnabled,
  isTenantFeatureEnabled,
} from "@/lib/tenant/featureFlags.server";
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

export type IngredientDto = {
  id: string;
  name: string;
  unit: string;
  unit_cost: number | null;
  stock_quantity: number | null;
  stock_min: number;
};

export type RecipeItemDto = {
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  quantity: number;
  unit_cost: number | null;
};

export type RecipeDto = {
  menu_item_id: string;
  menu_item_name: string;
  yield: number;
  unit_cost: number | null;
  items: RecipeItemDto[];
};

export const listIngredientsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<IngredientDto[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "recipe_inventory");

    const db = getDb();
    const rows = await db
      .select()
      .from(schema.ingredients)
      .where(eq(schema.ingredients.tenantId, data.tenantId))
      .orderBy(asc(schema.ingredients.name));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      unit: r.unit,
      unit_cost: r.unitCost != null ? Number(r.unitCost) : null,
      stock_quantity: r.stockQuantity != null ? Number(r.stockQuantity) : null,
      stock_min: r.stockMin != null ? Number(r.stockMin) : 0,
    }));
  });

export const upsertIngredientFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      id?: string;
      name: string;
      unit: string;
      unitCost?: number | null;
      stockQuantity?: number | null;
      stockMin?: number;
    }) => data,
  )
  .handler(async ({ data }): Promise<IngredientDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "recipe_inventory");

    const name = data.name.trim();
    if (!name) throw new Error("Nome do insumo é obrigatório");

    const db = getDb();
    const patch = {
      name,
      unit: data.unit.trim() || "un",
      unitCost: data.unitCost != null ? String(data.unitCost) : null,
      stockQuantity: data.stockQuantity != null ? String(data.stockQuantity) : null,
      stockMin: String(Math.max(0, data.stockMin ?? 0)),
      updatedAt: new Date(),
    };

    if (data.id) {
      const [row] = await db
        .update(schema.ingredients)
        .set(patch)
        .where(
          and(eq(schema.ingredients.id, data.id), eq(schema.ingredients.tenantId, data.tenantId)),
        )
        .returning();
      if (!row) throw new Error("Insumo não encontrado");
      return {
        id: row.id,
        name: row.name,
        unit: row.unit,
        unit_cost: row.unitCost != null ? Number(row.unitCost) : null,
        stock_quantity: row.stockQuantity != null ? Number(row.stockQuantity) : null,
        stock_min: row.stockMin != null ? Number(row.stockMin) : 0,
      };
    }

    const [row] = await db
      .insert(schema.ingredients)
      .values({ tenantId: data.tenantId, ...patch })
      .returning();

    return {
      id: row.id,
      name: row.name,
      unit: row.unit,
      unit_cost: row.unitCost != null ? Number(row.unitCost) : null,
      stock_quantity: row.stockQuantity != null ? Number(row.stockQuantity) : null,
      stock_min: row.stockMin != null ? Number(row.stockMin) : 0,
    };
  });

export const deleteIngredientFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; ingredientId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "recipe_inventory");

    const db = getDb();
    await db
      .delete(schema.ingredients)
      .where(
        and(
          eq(schema.ingredients.id, data.ingredientId),
          eq(schema.ingredients.tenantId, data.tenantId),
        ),
      );
    return { ok: true };
  });

export const getRecipeForMenuItemFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; menuItemId: string }) => data)
  .handler(async ({ data }): Promise<RecipeDto | null> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "recipe_inventory");

    const db = getDb();
    const [menuItem] = await db
      .select({ id: schema.menuItems.id, name: schema.menuItems.name })
      .from(schema.menuItems)
      .where(
        and(eq(schema.menuItems.id, data.menuItemId), eq(schema.menuItems.tenantId, data.tenantId)),
      )
      .limit(1);
    if (!menuItem) return null;

    const [recipe] = await db
      .select()
      .from(schema.recipes)
      .where(
        and(
          eq(schema.recipes.tenantId, data.tenantId),
          eq(schema.recipes.menuItemId, data.menuItemId),
        ),
      )
      .limit(1);

    if (!recipe) {
      return {
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        yield: 1,
        unit_cost: null,
        items: [],
      };
    }

    const lines = await db
      .select({
        ingredientId: schema.recipeItems.ingredientId,
        quantity: schema.recipeItems.quantity,
        name: schema.ingredients.name,
        unit: schema.ingredients.unit,
        unitCost: schema.ingredients.unitCost,
      })
      .from(schema.recipeItems)
      .innerJoin(schema.ingredients, eq(schema.recipeItems.ingredientId, schema.ingredients.id))
      .where(eq(schema.recipeItems.recipeId, recipe.id));

    const unitCost = await (
      await import("@/lib/menu/recipe-cost.server")
    ).computeRecipeUnitCost(db, data.tenantId, data.menuItemId);

    return {
      menu_item_id: menuItem.id,
      menu_item_name: menuItem.name,
      yield: recipe.yield,
      unit_cost: unitCost,
      items: lines.map((l) => ({
        ingredient_id: l.ingredientId,
        ingredient_name: l.name,
        unit: l.unit,
        quantity: Number(l.quantity),
        unit_cost: l.unitCost != null ? Number(l.unitCost) : null,
      })),
    };
  });

export const saveRecipeFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      menuItemId: string;
      yield?: number;
      items: Array<{ ingredientId: string; quantity: number }>;
    }) => data,
  )
  .handler(async ({ data }): Promise<RecipeDto> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "recipe_inventory");

    const db = getDb();
    const yieldQty = Math.max(1, Math.round(data.yield ?? 1));

    const [existing] = await db
      .select({ id: schema.recipes.id })
      .from(schema.recipes)
      .where(
        and(
          eq(schema.recipes.tenantId, data.tenantId),
          eq(schema.recipes.menuItemId, data.menuItemId),
        ),
      )
      .limit(1);

    let recipeId = existing?.id;
    if (recipeId) {
      await db
        .update(schema.recipes)
        .set({ yield: yieldQty })
        .where(eq(schema.recipes.id, recipeId));
      await db.delete(schema.recipeItems).where(eq(schema.recipeItems.recipeId, recipeId));
    } else {
      const [created] = await db
        .insert(schema.recipes)
        .values({
          tenantId: data.tenantId,
          menuItemId: data.menuItemId,
          yield: yieldQty,
        })
        .returning();
      recipeId = created.id;
    }

    for (const item of data.items) {
      if (item.quantity <= 0) continue;
      await db.insert(schema.recipeItems).values({
        recipeId,
        ingredientId: item.ingredientId,
        quantity: String(item.quantity),
      });
    }

    const saved = await getRecipeForMenuItemFn({
      data: { tenantId: data.tenantId, menuItemId: data.menuItemId },
    });
    if (!saved) throw new Error("Falha ao salvar ficha técnica");
    return saved;
  });

export const listRecipeUnitCostsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<Record<string, number>> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);

    if (!(await isTenantFeatureEnabled(data.tenantId, "recipe_inventory"))) {
      return {};
    }

    const db = getDb();
    const recipes = await db
      .select({ menuItemId: schema.recipes.menuItemId })
      .from(schema.recipes)
      .where(eq(schema.recipes.tenantId, data.tenantId));

    const ids = recipes.map((r) => r.menuItemId);
    const costs = await loadRecipeUnitCosts(db, data.tenantId, ids);
    return Object.fromEntries(costs);
  });

export const listRecipesOverviewFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageMenu(user, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "recipe_inventory");

    const db = getDb();
    const items = await db
      .select({ id: schema.menuItems.id, name: schema.menuItems.name })
      .from(schema.menuItems)
      .where(eq(schema.menuItems.tenantId, data.tenantId))
      .orderBy(asc(schema.menuItems.name));

    const recipes = await db
      .select({ menuItemId: schema.recipes.menuItemId, yield: schema.recipes.yield })
      .from(schema.recipes)
      .where(eq(schema.recipes.tenantId, data.tenantId));

    const recipeSet = new Set(recipes.map((r) => r.menuItemId));
    const costs = await loadRecipeUnitCosts(
      db,
      data.tenantId,
      items.map((i) => i.id),
    );

    return items.map((item) => ({
      menu_item_id: item.id,
      menu_item_name: item.name,
      has_recipe: recipeSet.has(item.id),
      unit_cost: costs.get(item.id) ?? null,
    }));
  });
