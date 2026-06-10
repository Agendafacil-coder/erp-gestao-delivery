import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
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
};

export async function upsertMenuItemForUser(user: SessionUser, data: UpsertMenuItemInput) {
  await assertTenantAccess(user.id, data.tenantId);
  assertCanManageMenu(user, data.tenantId);

  const db = getDb();
  const values = {
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
    updatedAt: new Date(),
  };

  if (data.id) {
    const [row] = await db
      .update(schema.menuItems)
      .set(values)
      .where(eq(schema.menuItems.id, data.id))
      .returning();
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
    .values({ ...values, sortOrder: nextSort })
    .returning();
  return row;
}
