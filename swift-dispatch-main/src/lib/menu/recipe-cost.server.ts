import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";

/** Custo unitário do produto a partir da ficha técnica (BOM). */
export async function computeRecipeUnitCost(
  db: Db,
  tenantId: string,
  menuItemId: string,
): Promise<number | null> {
  const [recipe] = await db
    .select({ id: schema.recipes.id, yield: schema.recipes.yield })
    .from(schema.recipes)
    .where(and(eq(schema.recipes.tenantId, tenantId), eq(schema.recipes.menuItemId, menuItemId)))
    .limit(1);

  if (!recipe) return null;

  const lines = await db
    .select({
      quantity: schema.recipeItems.quantity,
      unitCost: schema.ingredients.unitCost,
    })
    .from(schema.recipeItems)
    .innerJoin(schema.ingredients, eq(schema.recipeItems.ingredientId, schema.ingredients.id))
    .where(eq(schema.recipeItems.recipeId, recipe.id));

  if (lines.length === 0) return null;

  let batchCost = 0;
  for (const line of lines) {
    const unitCost = line.unitCost != null ? Number(line.unitCost) : 0;
    if (unitCost <= 0) return null;
    batchCost += unitCost * Number(line.quantity);
  }

  const yieldQty = Math.max(1, recipe.yield ?? 1);
  return Number((batchCost / yieldQty).toFixed(2));
}

export async function loadRecipeUnitCosts(
  db: Db,
  tenantId: string,
  menuItemIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (menuItemIds.length === 0) return out;

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

  if (recipes.length === 0) return out;

  const recipeIds = recipes.map((r) => r.id);
  const lines = await db
    .select({
      recipeId: schema.recipeItems.recipeId,
      quantity: schema.recipeItems.quantity,
      unitCost: schema.ingredients.unitCost,
    })
    .from(schema.recipeItems)
    .innerJoin(schema.ingredients, eq(schema.recipeItems.ingredientId, schema.ingredients.id))
    .where(inArray(schema.recipeItems.recipeId, recipeIds));

  const linesByRecipe = new Map<string, typeof lines>();
  for (const line of lines) {
    const bucket = linesByRecipe.get(line.recipeId) ?? [];
    bucket.push(line);
    linesByRecipe.set(line.recipeId, bucket);
  }

  for (const recipe of recipes) {
    const recipeLines = linesByRecipe.get(recipe.id) ?? [];
    if (recipeLines.length === 0) continue;

    let batchCost = 0;
    let complete = true;
    for (const line of recipeLines) {
      const unitCost = line.unitCost != null ? Number(line.unitCost) : 0;
      if (unitCost <= 0) {
        complete = false;
        break;
      }
      batchCost += unitCost * Number(line.quantity);
    }
    if (!complete) continue;

    const yieldQty = Math.max(1, recipe.yield ?? 1);
    out.set(recipe.menuItemId, Number((batchCost / yieldQty).toFixed(2)));
  }

  return out;
}
