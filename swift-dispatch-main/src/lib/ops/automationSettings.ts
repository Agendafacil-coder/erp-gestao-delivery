import { LIVE_AUTOMATIONS } from "@/lib/ops/automationRegistry";

/** ruleId → habilitado (omitido ou true = ligado) */
export type AutomationSettings = {
  enabled: Partial<Record<string, boolean>>;
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  enabled: Object.fromEntries(LIVE_AUTOMATIONS.map((r) => [r.id, true])),
};

const STORAGE_PREFIX = "erp_automation_settings_";
const cache: Record<string, AutomationSettings> = {};

export function clampAutomationSettings(
  raw: Partial<AutomationSettings> | null | undefined,
): AutomationSettings {
  const enabled: Record<string, boolean> = { ...DEFAULT_AUTOMATION_SETTINGS.enabled };
  if (raw?.enabled) {
    for (const rule of LIVE_AUTOMATIONS) {
      if (typeof raw.enabled[rule.id] === "boolean") {
        enabled[rule.id] = raw.enabled[rule.id]!;
      }
    }
  }
  return { enabled };
}

export function isAutomationEnabled(settings: AutomationSettings, ruleId: string): boolean {
  return settings.enabled[ruleId] !== false;
}

export function setAutomationSettingsCache(tenantId: string, settings: AutomationSettings): void {
  cache[tenantId] = clampAutomationSettings(settings);
}

export function clearAutomationSettingsCache(tenantId?: string): void {
  if (tenantId) delete cache[tenantId];
  else Object.keys(cache).forEach((k) => delete cache[k]);
}

function storageKey(tenantId?: string): string {
  return `${STORAGE_PREFIX}${tenantId ?? "default"}`;
}

export function getAutomationSettings(tenantId?: string): AutomationSettings {
  const key = tenantId ?? "default";
  if (cache[key]) return cache[key];

  if (typeof window === "undefined") return DEFAULT_AUTOMATION_SETTINGS;
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return DEFAULT_AUTOMATION_SETTINGS;
    const parsed = clampAutomationSettings(JSON.parse(raw) as Partial<AutomationSettings>);
    if (tenantId) cache[tenantId] = parsed;
    return parsed;
  } catch {
    return DEFAULT_AUTOMATION_SETTINGS;
  }
}

export function saveAutomationSettingsLocal(
  tenantId: string | undefined,
  settings: AutomationSettings,
): AutomationSettings {
  const next = clampAutomationSettings(settings);
  const key = tenantId ?? "default";
  cache[key] = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(tenantId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("automation-settings-updated", { detail: { tenantId } }));
  }
  return next;
}
