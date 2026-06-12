import { and, eq, sql } from "drizzle-orm";
import type { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  calculatePointsEarned,
  DEFAULT_LOYALTY_SETTINGS,
  normalizeLoyaltyPhone,
} from "@/lib/loyalty/loyalty";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function getWalletPoints(
  db: Db,
  tenantId: string,
  phone: string,
): Promise<number> {
  const normalized = normalizeLoyaltyPhone(phone);
  if (!normalized) return 0;

  const [row] = await db
    .select({ points: schema.loyaltyWallets.points })
    .from(schema.loyaltyWallets)
    .where(
      and(
        eq(schema.loyaltyWallets.tenantId, tenantId),
        eq(schema.loyaltyWallets.phone, normalized),
      ),
    )
    .limit(1);

  return row?.points ?? 0;
}

async function ensureWallet(
  tx: Tx,
  tenantId: string,
  phone: string,
): Promise<{ id: string; points: number }> {
  const normalized = normalizeLoyaltyPhone(phone);
  if (!normalized) throw new Error("Telefone inválido para fidelidade");

  const [existing] = await tx
    .select()
    .from(schema.loyaltyWallets)
    .where(
      and(
        eq(schema.loyaltyWallets.tenantId, tenantId),
        eq(schema.loyaltyWallets.phone, normalized),
      ),
    )
    .limit(1);

  if (existing) return { id: existing.id, points: existing.points };

  const [created] = await tx
    .insert(schema.loyaltyWallets)
    .values({ tenantId, phone: normalized, points: 0 })
    .returning();

  return { id: created.id, points: 0 };
}

export async function redeemLoyaltyPoints(
  tx: Tx,
  tenantId: string,
  phone: string,
  points: number,
): Promise<void> {
  if (points <= 0) return;

  const wallet = await ensureWallet(tx, tenantId, phone);
  if (wallet.points < points) {
    throw new Error("Saldo de fidelidade insuficiente");
  }

  await tx
    .update(schema.loyaltyWallets)
    .set({
      points: wallet.points - points,
      updatedAt: new Date(),
    })
    .where(eq(schema.loyaltyWallets.id, wallet.id));
}

export async function creditLoyaltyPoints(
  db: Db | Tx,
  tenantId: string,
  phone: string,
  points: number,
): Promise<void> {
  if (points <= 0) return;

  const normalized = normalizeLoyaltyPhone(phone);
  if (!normalized) return;

  await db
    .insert(schema.loyaltyWallets)
    .values({ tenantId, phone: normalized, points })
    .onConflictDoUpdate({
      target: [schema.loyaltyWallets.tenantId, schema.loyaltyWallets.phone],
      set: {
        points: sql`${schema.loyaltyWallets.points} + ${points}`,
        updatedAt: new Date(),
      },
    });
}

export async function restoreLoyaltyPointsOnCancel(
  db: Db,
  tenantId: string,
  phone: string | null | undefined,
  pointsRedeemed: number,
): Promise<void> {
  if (!pointsRedeemed || !phone?.trim()) return;
  await creditLoyaltyPoints(db, tenantId, phone, pointsRedeemed);
}

export function previewPointsEarned(totalPaid: number): number {
  return calculatePointsEarned(totalPaid, DEFAULT_LOYALTY_SETTINGS);
}
