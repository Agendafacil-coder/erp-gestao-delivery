import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";
import { syncMenuItemsAvailabilityFromStock } from "@/lib/menu/menu-stock-availability.server";

export async function deductMenuStock(
  db: Db,
  tenantId: string,
  qtyByItem: Map<string, number>,
): Promise<void> {
  const affected = new Set<string>();

  for (const [menuItemId, deduct] of qtyByItem) {
    const [updated] = await db
      .update(schema.menuItems)
      .set({
        stockQuantity: sql`${schema.menuItems.stockQuantity} - ${deduct}`,
        available: sql`CASE WHEN ${schema.menuItems.stockQuantity} - ${deduct} <= 0 THEN false ELSE ${schema.menuItems.available} END`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.menuItems.id, menuItemId),
          eq(schema.menuItems.tenantId, tenantId),
          sql`${schema.menuItems.stockQuantity} IS NOT NULL`,
          sql`${schema.menuItems.stockQuantity} >= ${deduct}`,
        ),
      )
      .returning({ id: schema.menuItems.id });

    if (!updated) {
      const [item] = await db
        .select({ name: schema.menuItems.name, stockQuantity: schema.menuItems.stockQuantity })
        .from(schema.menuItems)
        .where(and(eq(schema.menuItems.id, menuItemId), eq(schema.menuItems.tenantId, tenantId)))
        .limit(1);
      if (!item) throw new Error("Produto não encontrado no cardápio");
      if (item.stockQuantity === 0) {
        throw new Error(`${item.name} esgotou — remova da sacola`);
      }
      throw new Error(`Estoque insuficiente de ${item.name} (máx. ${item.stockQuantity ?? 0})`);
    }

    affected.add(menuItemId);
  }

  await syncMenuItemsAvailabilityFromStock(db, tenantId, affected);
}

export async function restoreMenuStockForOrder(
  db: Db,
  tenantId: string,
  orderId: string,
): Promise<number> {
  const lines = await db
    .select({
      menuItemId: schema.orderLineItems.menuItemId,
      quantity: schema.orderLineItems.quantity,
    })
    .from(schema.orderLineItems)
    .where(eq(schema.orderLineItems.orderId, orderId));

  const qtyByItem = new Map<string, number>();
  for (const line of lines) {
    if (!line.menuItemId) continue;
    qtyByItem.set(line.menuItemId, (qtyByItem.get(line.menuItemId) ?? 0) + line.quantity);
  }

  let restored = 0;
  const affected = new Set<string>();
  for (const [menuItemId, qty] of qtyByItem) {
    const [row] = await db
      .update(schema.menuItems)
      .set({
        stockQuantity: sql`${schema.menuItems.stockQuantity} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.menuItems.id, menuItemId),
          eq(schema.menuItems.tenantId, tenantId),
          sql`${schema.menuItems.stockQuantity} IS NOT NULL`,
        ),
      )
      .returning({ id: schema.menuItems.id });
    if (row) {
      restored += 1;
      affected.add(menuItemId);
    }
  }

  await syncMenuItemsAvailabilityFromStock(db, tenantId, affected, { allowUnpause: true });
  return restored;
}
