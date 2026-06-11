import { clampSlaSettings, DEFAULT_SLA_SETTINGS, type SlaSettings } from "@/lib/ops/slaSettings";

export function parseSlaSettingsJson(raw: string | null | undefined): SlaSettings {
  if (!raw?.trim()) return DEFAULT_SLA_SETTINGS;
  try {
    return clampSlaSettings(JSON.parse(raw) as Partial<SlaSettings>);
  } catch {
    return DEFAULT_SLA_SETTINGS;
  }
}

export function serializeSlaSettings(settings: SlaSettings): string {
  return JSON.stringify(clampSlaSettings(settings));
}
