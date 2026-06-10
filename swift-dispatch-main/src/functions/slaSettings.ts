import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  DEFAULT_SLA_SETTINGS,
  type SlaSettings,
  clampSlaSettings,
} from "@/lib/ops/slaSettings";
import { parseSlaSettingsJson, serializeSlaSettings } from "@/lib/ops/slaSettingsDb";
import { assertCanBatchDispatch } from "@/lib/rbac";
import { requireSessionUser } from "./session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export const getSlaSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<SlaSettings> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select({ slaSettings: schema.tenantMenuSettings.slaSettings })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    return row?.slaSettings ? parseSlaSettingsJson(row.slaSettings) : DEFAULT_SLA_SETTINGS;
  });

export const saveSlaSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; settings: SlaSettings }) => data)
  .handler(async ({ data }): Promise<SlaSettings> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanBatchDispatch(user, data.tenantId);

    const next = clampSlaSettings(data.settings);
    const serialized = serializeSlaSettings(next);
    const db = getDb();
    const now = new Date();

    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    if (existing) {
      await db
        .update(schema.tenantMenuSettings)
        .set({ slaSettings: serialized, updatedAt: now })
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId));
    } else {
      await db.insert(schema.tenantMenuSettings).values({
        tenantId: data.tenantId,
        slaSettings: serialized,
        updatedAt: now,
      });
    }

    return next;
  });

export const resetSlaSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<SlaSettings> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanBatchDispatch(user, data.tenantId);

    const db = getDb();
    const [existing] = await db
      .select({ id: schema.tenantMenuSettings.id })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    if (existing) {
      await db
        .update(schema.tenantMenuSettings)
        .set({ slaSettings: null, updatedAt: new Date() })
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId));
    }

    return DEFAULT_SLA_SETTINGS;
  });
