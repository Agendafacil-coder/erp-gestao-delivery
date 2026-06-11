import { eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import {
  DEFAULT_AUTOMATION_SETTINGS,
  type AutomationSettings,
  isAutomationEnabled,
} from "@/lib/ops/automationSettings";
import { parseAutomationSettingsJson } from "@/lib/ops/automationSettingsDb";

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; settings: AutomationSettings }>();

export function clearServerAutomationSettingsCache(tenantId?: string): void {
  if (tenantId) cache.delete(tenantId);
  else cache.clear();
}

export async function loadTenantAutomationSettings(tenantId: string): Promise<AutomationSettings> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.settings;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        automationSettings: schema.tenantMenuSettings.automationSettings,
        autoDispatchEnabled: schema.tenantMenuSettings.autoDispatchEnabled,
      })
      .from(schema.tenantMenuSettings)
      .where(eq(schema.tenantMenuSettings.tenantId, tenantId))
      .limit(1);

    const settings = row?.automationSettings
      ? parseAutomationSettingsJson(row.automationSettings)
      : DEFAULT_AUTOMATION_SETTINGS;

    settings.enabled["auto-dispatch"] = row?.autoDispatchEnabled ?? false;

    cache.set(tenantId, { at: Date.now(), settings });
    return settings;
  } catch {
    return DEFAULT_AUTOMATION_SETTINGS;
  }
}

export async function isTenantAutomationEnabled(
  tenantId: string,
  ruleId: string,
): Promise<boolean> {
  const settings = await loadTenantAutomationSettings(tenantId);
  return isAutomationEnabled(settings, ruleId);
}
