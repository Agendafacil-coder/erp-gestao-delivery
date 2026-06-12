import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { queryCoPurchaseCounts } from "@/lib/menu/coPurchase.server";
import {
  fallbackUpsellFromMenu,
  mergeUpsellSuggestions,
  rankCoPurchaseCounts,
  type SmartUpsellSuggestion,
} from "@/lib/menu/smartUpsell";

export const getSmartUpsellFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantSlug: string; cartItemIds: string[]; limit?: number }) => data,
  )
  .handler(async ({ data }): Promise<SmartUpsellSuggestion[]> => {
    const limit = data.limit ?? 3;
    const cartIds = new Set(data.cartItemIds);
    if (!cartIds.size) return [];

    const db = getDb();
    const [tenant] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) return [];

    const menuRows = await db
      .select()
      .from(schema.menuItems)
      .where(and(eq(schema.menuItems.tenantId, tenant.id), eq(schema.menuItems.available, true)));

    const menuItems = menuRows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      image_url: row.imageUrl,
      available: row.available,
      is_drink: row.isDrink,
      is_combo: row.isCombo,
      is_featured: row.isFeatured,
      category_id: row.categoryId,
      sales_count: row.salesCount,
      variations: [] as [],
      addons: [] as [],
    }));

    const itemMap = new Map(menuItems.map((i) => [i.id, i]));
    const coPurchase = await queryCoPurchaseCounts(tenant.id, data.cartItemIds, limit * 3);
    const fromHistory = rankCoPurchaseCounts(coPurchase, cartIds, itemMap, limit);

    if (fromHistory.length >= limit) return fromHistory;

    const fallback = fallbackUpsellFromMenu(menuItems, cartIds, limit);
    return mergeUpsellSuggestions(fromHistory, fallback, limit);
  });
