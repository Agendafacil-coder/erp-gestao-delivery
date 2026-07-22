import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  parseFeatureFlagsJson,
  serializeFeatureFlags,
  type TenantFeatureFlags,
} from "@/lib/tenant/featureFlags";
import {
  assertTenantFeatureEnabled,
  loadTenantFeatureFlags,
} from "@/lib/tenant/featureFlags.server";
import {
  parseDriverCommissionJson,
  serializeDriverCommission,
  type DriverCommissionSettings,
} from "@/lib/drivers/driverCommission";
import { orderPhoneNormalizedSql } from "@/lib/crm/customerProfiles.server";
import { requireSessionUser } from "./session";
import { assertCanAccessFinance } from "@/lib/rbac";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export const getFeatureFlagsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<TenantFeatureFlags> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select({ featureFlags: schema.tenantMenuSettings.featureFlags })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    return loadTenantFeatureFlags(data.tenantId);
  });

/** Flags públicas expostas no cardápio digital (sem auth). */
export const getPublicFeatureFlagsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantSlug: string }) => data)
  .handler(async ({ data }): Promise<Pick<TenantFeatureFlags, "customer_favorites">> => {
    const db = getDb();
    const [tenant] = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, data.tenantSlug))
      .limit(1);

    if (!tenant) return {};

    const flags = await loadTenantFeatureFlags(tenant.id);
    return { customer_favorites: flags.customer_favorites };
  });

export const updateFeatureFlagsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; flags: TenantFeatureFlags }) => data)
  .handler(async ({ data }): Promise<TenantFeatureFlags> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const serialized = serializeFeatureFlags(data.flags);
    const now = new Date();

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    if (existing) {
      await db
        .update(schema.tenantMenuSettings)
        .set({ featureFlags: serialized, updatedAt: now })
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId));
    } else {
      await db.insert(schema.tenantMenuSettings).values({
        tenantId: data.tenantId,
        featureFlags: serialized,
        updatedAt: now,
      });
    }

    return parseFeatureFlagsJson(serialized);
  });

export const getDriverCommissionFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<DriverCommissionSettings> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select({ driverCommissionSettings: schema.tenantMenuSettings.driverCommissionSettings })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    return parseDriverCommissionJson(row?.driverCommissionSettings);
  });

export const updateDriverCommissionFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; settings: DriverCommissionSettings }) => data)
  .handler(async ({ data }): Promise<DriverCommissionSettings> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const serialized = serializeDriverCommission(data.settings);
    const now = new Date();

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    if (existing) {
      await db
        .update(schema.tenantMenuSettings)
        .set({ driverCommissionSettings: serialized, updatedAt: now })
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId));
    } else {
      await db.insert(schema.tenantMenuSettings).values({
        tenantId: data.tenantId,
        driverCommissionSettings: serialized,
        updatedAt: now,
      });
    }

    return parseDriverCommissionJson(serialized);
  });

export type CustomerProfileDto = {
  phone: string;
  name: string | null;
  notes: string | null;
  order_count: number;
  total_spent: number;
  avg_ticket: number;
  last_order_at: string | null;
  recent_orders: Array<{
    id: string;
    code: string;
    total_amount: number;
    delivered_at: string | null;
    channel: string | null;
  }>;
};

export const getCustomerProfileFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string; phone: string }) => data)
  .handler(async ({ data }): Promise<CustomerProfileDto | null> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "crm_profiles");

    const digits = data.phone.replace(/\D/g, "");
    if (digits.length < 10) return null;

    const db = getDb();

    const phoneKey = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

    const [profile] = await db
      .select()
      .from(schema.customerProfiles)
      .where(
        and(
          eq(schema.customerProfiles.tenantId, data.tenantId),
          eq(schema.customerProfiles.phone, phoneKey),
        ),
      )
      .limit(1);

    const recentOrders = await db
      .select({
        id: schema.orders.id,
        code: schema.orders.code,
        customerName: schema.orders.customerName,
        totalAmount: schema.orders.totalAmount,
        deliveredAt: schema.orders.deliveredAt,
        channel: schema.orders.channel,
      })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.tenantId, data.tenantId),
          sql`${orderPhoneNormalizedSql()} = ${phoneKey}`,
        ),
      )
      .orderBy(desc(schema.orders.placedAt))
      .limit(10);

    if (!profile && recentOrders.length === 0) return null;

    const orderCount = profile?.orderCount ?? recentOrders.length;
    const totalSpent = profile
      ? Number(profile.totalSpent)
      : recentOrders.reduce((a, o) => a + Number(o.totalAmount), 0);

    const displayName =
      profile?.name?.trim() ||
      recentOrders.find((o) => o.customerName?.trim())?.customerName?.trim() ||
      null;

    return {
      phone: phoneKey,
      name: displayName,
      notes: profile?.notes ?? null,
      order_count: orderCount,
      total_spent: totalSpent,
      avg_ticket: orderCount > 0 ? totalSpent / orderCount : 0,
      last_order_at: profile?.lastOrderAt?.toISOString() ?? null,
      recent_orders: recentOrders.map((o) => ({
        id: o.id,
        code: o.code,
        total_amount: Number(o.totalAmount),
        delivered_at: o.deliveredAt?.toISOString() ?? null,
        channel: o.channel,
      })),
    };
  });

export type CampaignRecipient = {
  phone: string;
  name: string | null;
  order_count: number;
  total_spent: number;
};

export const listCampaignRecipientsFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { tenantId: string; segment: "vip" | "inactive_30d" | "high_ticket" | "all" }) => data,
  )
  .handler(async ({ data }): Promise<CampaignRecipient[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "whatsapp_campaigns");

    const db = getDb();
    const profiles = await db
      .select()
      .from(schema.customerProfiles)
      .where(eq(schema.customerProfiles.tenantId, data.tenantId))
      .orderBy(desc(schema.customerProfiles.lastOrderAt));

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    return profiles
      .filter((p) => {
        if (data.segment === "all") return true;
        if (data.segment === "vip") return p.orderCount >= 5;
        if (data.segment === "high_ticket") {
          const avg = p.orderCount > 0 ? Number(p.totalSpent) / p.orderCount : 0;
          return avg > 80;
        }
        if (data.segment === "inactive_30d") {
          const last = p.lastOrderAt?.getTime() ?? 0;
          return last > 0 && last < thirtyDaysAgo;
        }
        return true;
      })
      .map((p) => ({
        phone: p.phone,
        name: p.name,
        order_count: p.orderCount,
        total_spent: Number(p.totalSpent),
      }));
  });

export const listDriverEarningsFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { tenantId: string; driverId?: string; from?: string; to?: string }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "driver_commission");

    const db = getDb();
    const conditions = [eq(schema.driverEarnings.tenantId, data.tenantId)];
    if (data.driverId) conditions.push(eq(schema.driverEarnings.driverId, data.driverId));
    if (data.from?.trim()) {
      const from = new Date(`${data.from.trim()}T00:00:00`);
      if (Number.isFinite(from.getTime())) conditions.push(gte(schema.driverEarnings.createdAt, from));
    }
    if (data.to?.trim()) {
      const to = new Date(`${data.to.trim()}T23:59:59.999`);
      if (Number.isFinite(to.getTime())) conditions.push(lte(schema.driverEarnings.createdAt, to));
    }

    const rows = await db
      .select({
        id: schema.driverEarnings.id,
        driverId: schema.driverEarnings.driverId,
        orderId: schema.driverEarnings.orderId,
        amount: schema.driverEarnings.amount,
        paidAt: schema.driverEarnings.paidAt,
        createdAt: schema.driverEarnings.createdAt,
        orderCode: schema.orders.code,
        driverName: schema.drivers.name,
      })
      .from(schema.driverEarnings)
      .leftJoin(schema.orders, eq(schema.driverEarnings.orderId, schema.orders.id))
      .leftJoin(schema.drivers, eq(schema.driverEarnings.driverId, schema.drivers.id))
      .where(and(...conditions))
      .orderBy(desc(schema.driverEarnings.createdAt))
      .limit(200);

    const mapped = rows.map((r) => ({
      id: r.id,
      driver_id: r.driverId,
      driver_name: r.driverName ?? "—",
      order_id: r.orderId,
      order_code: r.orderCode ?? "—",
      amount: Number(r.amount),
      paid_at: r.paidAt?.toISOString() ?? null,
      created_at: r.createdAt.toISOString(),
    }));

    const total = mapped.reduce((a, r) => a + r.amount, 0);
    const unpaid = mapped.filter((r) => !r.paid_at).reduce((a, r) => a + r.amount, 0);

    const byDriverMap = new Map<
      string,
      { driver_id: string; driver_name: string; total: number; unpaid: number; deliveries: number }
    >();
    for (const r of mapped) {
      const prev = byDriverMap.get(r.driver_id) ?? {
        driver_id: r.driver_id,
        driver_name: r.driver_name,
        total: 0,
        unpaid: 0,
        deliveries: 0,
      };
      prev.total += r.amount;
      prev.deliveries += 1;
      if (!r.paid_at) prev.unpaid += r.amount;
      byDriverMap.set(r.driver_id, prev);
    }

    return {
      rows: mapped,
      total,
      unpaid,
      by_driver: [...byDriverMap.values()].sort((a, b) => b.unpaid - a.unpaid || b.total - a.total),
    };
  });

/** Marca comissões como pagas (dia e/ou entregador). */
export const markDriverEarningsPaidFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      tenantId: string;
      from?: string;
      to?: string;
      driverId?: string;
      earningIds?: string[];
    }) => data,
  )
  .handler(async ({ data }): Promise<{ updated: number }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanAccessFinance(user, data.tenantId);
    await assertTenantFeatureEnabled(data.tenantId, "driver_commission");

    const db = getDb();
    const conditions = [
      eq(schema.driverEarnings.tenantId, data.tenantId),
      isNull(schema.driverEarnings.paidAt),
    ];

    if (data.earningIds?.length) {
      conditions.push(inArray(schema.driverEarnings.id, data.earningIds));
    } else {
      if (data.driverId) conditions.push(eq(schema.driverEarnings.driverId, data.driverId));
      if (data.from?.trim()) {
        const from = new Date(`${data.from.trim()}T00:00:00`);
        if (Number.isFinite(from.getTime())) conditions.push(gte(schema.driverEarnings.createdAt, from));
      }
      if (data.to?.trim()) {
        const to = new Date(`${data.to.trim()}T23:59:59.999`);
        if (Number.isFinite(to.getTime())) conditions.push(lte(schema.driverEarnings.createdAt, to));
      }
    }

    const updated = await db
      .update(schema.driverEarnings)
      .set({ paidAt: new Date() })
      .where(and(...conditions))
      .returning({ id: schema.driverEarnings.id });

    return { updated: updated.length };
  });
