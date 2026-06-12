import { and, eq, gte, inArray, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";

const LOOKBACK_DAYS = 60;

export async function queryCoPurchaseCounts(
  tenantId: string,
  cartItemIds: string[],
  limit = 8,
): Promise<Array<{ menu_item_id: string; count: number }>> {
  if (!cartItemIds.length) return [];

  const db = getDb();
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const matchingOrders = db
    .selectDistinct({ orderId: schema.orderLineItems.orderId })
    .from(schema.orderLineItems)
    .innerJoin(schema.orders, eq(schema.orderLineItems.orderId, schema.orders.id))
    .where(
      and(
        eq(schema.orders.tenantId, tenantId),
        gte(schema.orders.placedAt, since),
        inArray(schema.orderLineItems.menuItemId, cartItemIds),
      ),
    );

  const rows = await db
    .select({
      menu_item_id: schema.orderLineItems.menuItemId,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.orderLineItems)
    .where(
      and(
        inArray(schema.orderLineItems.orderId, matchingOrders),
        notInArray(schema.orderLineItems.menuItemId, cartItemIds),
      ),
    )
    .groupBy(schema.orderLineItems.menuItemId)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return rows
    .filter((r) => r.menu_item_id)
    .map((r) => ({ menu_item_id: r.menu_item_id!, count: Number(r.count) }));
}
