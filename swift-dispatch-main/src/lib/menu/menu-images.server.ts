import { and, eq, isNull, or } from "drizzle-orm";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";
import { pickMenuPlaceholderImage } from "@/lib/menu/menu-placeholders";

export type MenuImageBackfillResult = {
  updated: number;
  items: Array<{ id: string; name: string; imageUrl: string }>;
};

export async function backfillMissingMenuImages(
  db: Db,
  tenantId: string,
): Promise<MenuImageBackfillResult> {
  const categories = await db
    .select()
    .from(schema.menuCategories)
    .where(eq(schema.menuCategories.tenantId, tenantId));
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));

  const items = await db
    .select()
    .from(schema.menuItems)
    .where(
      and(
        eq(schema.menuItems.tenantId, tenantId),
        or(isNull(schema.menuItems.imageUrl), eq(schema.menuItems.imageUrl, "")),
      ),
    );

  const updatedItems: MenuImageBackfillResult["items"] = [];

  for (const item of items) {
    const imageUrl = pickMenuPlaceholderImage({
      id: item.id,
      name: item.name,
      categoryName: categoryById.get(item.categoryId),
      isCombo: item.isCombo ?? false,
      isDrink: item.isDrink ?? false,
    });

    await db
      .update(schema.menuItems)
      .set({ imageUrl, updatedAt: new Date() })
      .where(eq(schema.menuItems.id, item.id));

    updatedItems.push({ id: item.id, name: item.name, imageUrl });
  }

  return { updated: updatedItems.length, items: updatedItems };
}
