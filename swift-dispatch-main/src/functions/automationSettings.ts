import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  clampAutomationSettings,
  DEFAULT_AUTOMATION_SETTINGS,
  type AutomationSettings,
} from "@/lib/ops/automationSettings";
import {
  parseAutomationSettingsJson,
  serializeAutomationSettings,
} from "@/lib/ops/automationSettingsDb";
import { clearServerAutomationSettingsCache } from "@/lib/ops/loadAutomationSettings";
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

export const getAutomationSettingsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<AutomationSettings> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);

    const db = getDb();
    const [row] = await db
      .select({
        automationSettings: schema.tenantMenuSettings.automationSettings,
        autoDispatchEnabled: schema.tenantMenuSettings.autoDispatchEnabled,
      })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId))
      .limit(1);

    const settings = row?.automationSettings
      ? parseAutomationSettingsJson(row.automationSettings)
      : DEFAULT_AUTOMATION_SETTINGS;

    settings.enabled["auto-dispatch"] = row?.autoDispatchEnabled ?? false;
    return clampAutomationSettings(settings);
  });

export const saveAutomationSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string; settings: AutomationSettings }) => data)
  .handler(async ({ data }): Promise<AutomationSettings> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanBatchDispatch(user, data.tenantId);

    const next = clampAutomationSettings(data.settings);
    const serialized = serializeAutomationSettings(next);
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
        .set({ automationSettings: serialized, updatedAt: now })
        .where(eq(schema.tenantMenuSettings.tenantId, data.tenantId));
    } else {
      await db.insert(schema.tenantMenuSettings).values({
        tenantId: data.tenantId,
        automationSettings: serialized,
        updatedAt: now,
      });
    }

    clearServerAutomationSettingsCache(data.tenantId);
    return next;
  });
