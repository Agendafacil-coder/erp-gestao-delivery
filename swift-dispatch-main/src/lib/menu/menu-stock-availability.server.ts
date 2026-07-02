import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";
import { isMenuItemLowStock } from "@/lib/menu/menu-stock";

export type StockAvailabilitySyncResult = {
  menuItemId: string;
  name: string;
  paused: boolean;
  unpaused: boolean;
};

/**
 * Pausa item no cardápio quando estoque ≤ mínimo.
 * Despausa somente quando allowUnpause=true (reposição manual/cancelamento).
 */
export async function syncMenuItemAvailabilityFromStock(
  db: Db,
  tenantId: string,
  menuItemId: string,
  options?: { allowUnpause?: boolean },
): Promise<StockAvailabilitySyncResult | null> {
  const [item] = await db
    .select({
      id: schema.menuItems.id,
      name: schema.menuItems.name,
      available: schema.menuItems.available,
      stockQuantity: schema.menuItems.stockQuantity,
      stockMin: schema.menuItems.stockMin,
    })
    .from(schema.menuItems)
    .where(and(eq(schema.menuItems.id, menuItemId), eq(schema.menuItems.tenantId, tenantId)))
    .limit(1);

  if (!item || item.stockQuantity == null) return null;

  const low = isMenuItemLowStock(item.stockQuantity, item.stockMin);

  if (low && item.available) {
    await db
      .update(schema.menuItems)
      .set({ available: false, updatedAt: new Date() })
      .where(eq(schema.menuItems.id, menuItemId));
    return { menuItemId, name: item.name, paused: true, unpaused: false };
  }

  if (!low && !item.available && options?.allowUnpause) {
    await db
      .update(schema.menuItems)
      .set({ available: true, updatedAt: new Date() })
      .where(eq(schema.menuItems.id, menuItemId));
    return { menuItemId, name: item.name, paused: false, unpaused: true };
  }

  return null;
}

export async function syncMenuItemsAvailabilityFromStock(
  db: Db,
  tenantId: string,
  menuItemIds: Iterable<string>,
  options?: { allowUnpause?: boolean },
): Promise<StockAvailabilitySyncResult[]> {
  const results: StockAvailabilitySyncResult[] = [];
  for (const menuItemId of menuItemIds) {
    const result = await syncMenuItemAvailabilityFromStock(db, tenantId, menuItemId, options);
    if (result && (result.paused || result.unpaused)) results.push(result);
  }
  return results;
}
