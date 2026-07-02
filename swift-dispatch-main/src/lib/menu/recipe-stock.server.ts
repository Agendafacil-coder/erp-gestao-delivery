import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";
import { isTenantFeatureEnabled } from "@/lib/tenant/featureFlags.server";

type RecipeLine = {
  menuItemId: string;
  ingredientId: string;
  perUnitQty: number;
};

async function loadRecipeLinesForMenuItems(
  db: Db,
  tenantId: string,
  menuItemIds: string[],
): Promise<RecipeLine[]> {
  if (menuItemIds.length === 0) return [];

  const recipes = await db
    .select({
      id: schema.recipes.id,
      menuItemId: schema.recipes.menuItemId,
      yield: schema.recipes.yield,
    })
    .from(schema.recipes)
    .where(
      and(eq(schema.recipes.tenantId, tenantId), inArray(schema.recipes.menuItemId, menuItemIds)),
    );

  if (recipes.length === 0) return [];

  const recipeIds = recipes.map((r) => r.id);
  const items = await db
    .select({
      recipeId: schema.recipeItems.recipeId,
      ingredientId: schema.recipeItems.ingredientId,
      quantity: schema.recipeItems.quantity,
    })
    .from(schema.recipeItems)
    .where(inArray(schema.recipeItems.recipeId, recipeIds));

  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const out: RecipeLine[] = [];

  for (const item of items) {
    const recipe = recipeById.get(item.recipeId);
    if (!recipe) continue;
    const yieldQty = Math.max(1, recipe.yield ?? 1);
    out.push({
      menuItemId: recipe.menuItemId,
      ingredientId: item.ingredientId,
      perUnitQty: Number(item.quantity) / yieldQty,
    });
  }

  return out;
}

/** Baixa insumos conforme ficha técnica (flag recipe_inventory). */
export async function deductRecipeStock(
  db: Db,
  tenantId: string,
  qtyByMenuItem: Map<string, number>,
): Promise<void> {
  if (!(await isTenantFeatureEnabled(tenantId, "recipe_inventory"))) return;
  if (qtyByMenuItem.size === 0) return;

  const menuItemIds = [...qtyByMenuItem.keys()];
  const recipeLines = await loadRecipeLinesForMenuItems(db, tenantId, menuItemIds);
  if (recipeLines.length === 0) return;

  const deductByIngredient = new Map<string, number>();
  for (const line of recipeLines) {
    const orderQty = qtyByMenuItem.get(line.menuItemId) ?? 0;
    if (orderQty <= 0) continue;
    const deduct = line.perUnitQty * orderQty;
    deductByIngredient.set(
      line.ingredientId,
      (deductByIngredient.get(line.ingredientId) ?? 0) + deduct,
    );
  }

  for (const [ingredientId, deduct] of deductByIngredient) {
    await db
      .update(schema.ingredients)
      .set({
        stockQuantity: sql`GREATEST(0, ${schema.ingredients.stockQuantity}::numeric - ${deduct})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.ingredients.id, ingredientId),
          eq(schema.ingredients.tenantId, tenantId),
          sql`${schema.ingredients.stockQuantity} IS NOT NULL`,
        ),
      );
  }
}

/** Restaura insumos ao cancelar pedido. */
export async function restoreRecipeStockForOrder(
  db: Db,
  tenantId: string,
  orderId: string,
): Promise<void> {
  if (!(await isTenantFeatureEnabled(tenantId, "recipe_inventory"))) return;

  const lines = await db
    .select({
      menuItemId: schema.orderLineItems.menuItemId,
      quantity: schema.orderLineItems.quantity,
    })
    .from(schema.orderLineItems)
    .where(eq(schema.orderLineItems.orderId, orderId));

  const qtyByMenuItem = new Map<string, number>();
  for (const line of lines) {
    if (!line.menuItemId) continue;
    qtyByMenuItem.set(line.menuItemId, (qtyByMenuItem.get(line.menuItemId) ?? 0) + line.quantity);
  }

  const menuItemIds = [...qtyByMenuItem.keys()];
  const recipeLines = await loadRecipeLinesForMenuItems(db, tenantId, menuItemIds);
  if (recipeLines.length === 0) return;

  const restoreByIngredient = new Map<string, number>();
  for (const line of recipeLines) {
    const orderQty = qtyByMenuItem.get(line.menuItemId) ?? 0;
    if (orderQty <= 0) continue;
    const restore = line.perUnitQty * orderQty;
    restoreByIngredient.set(
      line.ingredientId,
      (restoreByIngredient.get(line.ingredientId) ?? 0) + restore,
    );
  }

  for (const [ingredientId, qty] of restoreByIngredient) {
    await db
      .update(schema.ingredients)
      .set({
        stockQuantity: sql`${schema.ingredients.stockQuantity}::numeric + ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.ingredients.id, ingredientId),
          eq(schema.ingredients.tenantId, tenantId),
          sql`${schema.ingredients.stockQuantity} IS NOT NULL`,
        ),
      );
  }
}
