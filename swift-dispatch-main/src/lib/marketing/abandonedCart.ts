import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { normalizeLoyaltyPhone } from "@/lib/loyalty/loyalty";

export const ABANDONED_CART_DELAY_MINUTES = 15;

function menuUrl(tenantSlug: string): string {
  const base = process.env.PUBLIC_APP_URL ?? process.env.VITE_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${tenantSlug}`;
}

export type AbandonedCartInput = {
  tenantSlug: string;
  phone: string;
  customerName?: string;
  cartJson: string;
  subtotal: number;
};

export async function upsertAbandonedCartLead(input: AbandonedCartInput): Promise<void> {
  const normalized = normalizeLoyaltyPhone(input.phone);
  if (!normalized || !input.cartJson.trim()) return;

  const db = getDb();
  const [tenant] = await db
    .select({ id: schema.tenants.id })
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, input.tenantSlug))
    .limit(1);

  if (!tenant) return;

  const now = new Date();
  await db
    .insert(schema.abandonedCartLeads)
    .values({
      tenantId: tenant.id,
      tenantSlug: input.tenantSlug,
      phone: normalized,
      customerName: input.customerName?.trim() || null,
      cartJson: input.cartJson,
      subtotal: String(Math.max(0, input.subtotal).toFixed(2)),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.abandonedCartLeads.tenantId, schema.abandonedCartLeads.phone],
      set: {
        tenantSlug: input.tenantSlug,
        customerName: input.customerName?.trim() || null,
        cartJson: input.cartJson,
        subtotal: String(Math.max(0, input.subtotal).toFixed(2)),
        updatedAt: now,
        remindedAt: null,
      },
    });
}

export async function markAbandonedCartConverted(
  tenantId: string,
  phone: string,
): Promise<void> {
  const normalized = normalizeLoyaltyPhone(phone);
  if (!normalized) return;

  const db = getDb();
  await db
    .update(schema.abandonedCartLeads)
    .set({ convertedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.abandonedCartLeads.tenantId, tenantId),
        eq(schema.abandonedCartLeads.phone, normalized),
        isNull(schema.abandonedCartLeads.convertedAt),
      ),
    );
}

export { menuUrl };
