import { and, eq } from "drizzle-orm";
import type { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  computeDriverCommission,
  parseDriverCommissionJson,
} from "@/lib/drivers/driverCommission";
import { isFeatureEnabled, parseFeatureFlagsJson } from "@/lib/tenant/featureFlags";

type Db = ReturnType<typeof getDb>;

/** Registra comissão ao marcar pedido como entregue (não bloqueia fluxo) */
export async function recordDriverEarningOnDelivery(
  db: Db,
  input: {
    tenantId: string;
    orderId: string;
    driverId: string | null;
    deliveryFee: number;
  },
): Promise<void> {
  if (!input.driverId) return;

  const [settingsRow] = await db
    .select({
      featureFlags: schema.tenantMenuSettings.featureFlags,
      driverCommissionSettings: schema.tenantMenuSettings.driverCommissionSettings,
    })
    .from(schema.tenantMenuSettings)
    .where(eq(schema.tenantMenuSettings.tenantId, input.tenantId))
    .limit(1);

  const flags = parseFeatureFlagsJson(settingsRow?.featureFlags);
  if (!isFeatureEnabled(flags, "driver_commission")) return;

  const commission = parseDriverCommissionJson(settingsRow?.driverCommissionSettings);
  const amount = computeDriverCommission(commission, input.deliveryFee);
  if (amount <= 0) return;

  const [existing] = await db
    .select({ id: schema.driverEarnings.id })
    .from(schema.driverEarnings)
    .where(eq(schema.driverEarnings.orderId, input.orderId))
    .limit(1);

  if (existing) return;

  await db.insert(schema.driverEarnings).values({
    tenantId: input.tenantId,
    driverId: input.driverId,
    orderId: input.orderId,
    amount: String(amount),
  });
}

export async function getDriverEarningsSummary(
  db: Db,
  tenantId: string,
  driverId?: string,
) {
  const rows = await db
    .select()
    .from(schema.driverEarnings)
    .where(
      driverId
        ? and(
            eq(schema.driverEarnings.tenantId, tenantId),
            eq(schema.driverEarnings.driverId, driverId),
          )
        : eq(schema.driverEarnings.tenantId, tenantId),
    );

  const total = rows.reduce((acc, r) => acc + Number(r.amount), 0);
  const unpaid = rows
    .filter((r) => !r.paidAt)
    .reduce((acc, r) => acc + Number(r.amount), 0);

  return { rows, total, unpaid, count: rows.length };
}
