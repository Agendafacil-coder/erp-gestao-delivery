import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db/connection.server";
import { schema } from "@/db";

type Db = Db;

export type CmvDeliveryResult = {
  recorded: number;
  stockAdjusted: number;
  skipped: boolean;
};

/**
 * Ao marcar pedido como entregue: grava financial_cmv_entries e baixa estoque.
 * Idempotente — não duplica se já existir registro para o pedido.
 */
export async function recordCmvOnDelivery(
  db: Db,
  orderId: string,
  tenantId: string,
): Promise<CmvDeliveryResult> {
  const [existing] = await db
    .select({ id: schema.financialCmvEntries.id })
    .from(schema.financialCmvEntries)
    .where(
      and(
        eq(schema.financialCmvEntries.orderId, orderId),
        eq(schema.financialCmvEntries.tenantId, tenantId),
      ),
    )
    .limit(1);

  if (existing) {
    return { recorded: 0, stockAdjusted: 0, skipped: true };
  }

  const lines = await db
    .select({
      menuItemId: schema.orderLineItems.menuItemId,
      quantity: schema.orderLineItems.quantity,
    })
    .from(schema.orderLineItems)
    .where(eq(schema.orderLineItems.orderId, orderId));

  if (lines.length === 0) {
    return { recorded: 0, stockAdjusted: 0, skipped: false };
  }

  const menuIds = [
    ...new Set(lines.map((l) => l.menuItemId).filter((id): id is string => id != null)),
  ];

  const menuRows =
    menuIds.length > 0
      ? await db
          .select({
            id: schema.menuItems.id,
            unitCost: schema.menuItems.unitCost,
            stockQuantity: schema.menuItems.stockQuantity,
          })
          .from(schema.menuItems)
          .where(
            and(
              eq(schema.menuItems.tenantId, tenantId),
              inArray(schema.menuItems.id, menuIds),
            ),
          )
      : [];

  const menuById = new Map(menuRows.map((r) => [r.id, r]));

  const entries: (typeof schema.financialCmvEntries.$inferInsert)[] = [];
  const stockDeduct = new Map<string, number>();

  for (const line of lines) {
    const menuId = line.menuItemId;
    const qty = line.quantity;
    const menu = menuId ? menuById.get(menuId) : undefined;
    const unitCost =
      menu?.unitCost != null && Number(menu.unitCost) > 0 ? Number(menu.unitCost) : null;

    entries.push({
      tenantId,
      orderId,
      menuItemId: menuId,
      quantity: qty,
      unitCost: unitCost != null ? String(unitCost) : null,
      totalCost: unitCost != null ? String((unitCost * qty).toFixed(2)) : null,
      source: unitCost != null ? "order_line" : "manual",
    });

    if (menuId && menu?.stockQuantity != null) {
      stockDeduct.set(menuId, (stockDeduct.get(menuId) ?? 0) + qty);
    }
  }

  if (entries.length > 0) {
    await db.insert(schema.financialCmvEntries).values(entries);
  }

  let stockAdjusted = 0;
  for (const [menuId, deduct] of stockDeduct) {
    await db
      .update(schema.menuItems)
      .set({
        stockQuantity: sql`GREATEST(0, ${schema.menuItems.stockQuantity} - ${deduct})`,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.menuItems.id, menuId), eq(schema.menuItems.tenantId, tenantId)));
    stockAdjusted += 1;
  }

  return { recorded: entries.length, stockAdjusted, skipped: false };
}
