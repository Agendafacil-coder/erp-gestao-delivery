import {
  clampAutomationSettings,
  DEFAULT_AUTOMATION_SETTINGS,
  type AutomationSettings,
} from "@/lib/ops/automationSettings";

export function parseAutomationSettingsJson(raw: string | null | undefined): AutomationSettings {
  if (!raw?.trim()) return DEFAULT_AUTOMATION_SETTINGS;
  try {
    return clampAutomationSettings(JSON.parse(raw) as Partial<AutomationSettings>);
  } catch {
    return DEFAULT_AUTOMATION_SETTINGS;
  }
}

export function serializeAutomationSettings(settings: AutomationSettings): string {
  return JSON.stringify(clampAutomationSettings(settings));
}
