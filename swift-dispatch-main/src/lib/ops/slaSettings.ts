export type SlaSettings = {
  /** Fração do SLA (0.5–1) usada como limiar de risco — ex.: 0.85 = 85% */
  slaRiskRatio: number;
  /** Raio máximo (km) para agrupamento de rotas em lote */
  batchRadiusKm: number;
  congestionMode: "auto" | "manual";
  /** Multiplicador ETA quando congestionMode = manual */
  congestionMultiplier: number;
  /** Pedidos em preparo para disparar alerta de gargalo na cozinha */
  kitchenBottleneckMin: number;
};

export const DEFAULT_SLA_SETTINGS: SlaSettings = {
  slaRiskRatio: 0.85,
  batchRadiusKm: 2.4,
  congestionMode: "auto",
  congestionMultiplier: 1.4,
  kitchenBottleneckMin: 5,
};

const STORAGE_PREFIX = "erp_sla_settings_";

const cache: Record<string, SlaSettings> = {};

export function setSlaSettingsCache(tenantId: string, settings: SlaSettings): void {
  cache[tenantId] = clampSlaSettings(settings);
}

export function clearSlaSettingsCache(tenantId?: string): void {
  if (tenantId) delete cache[tenantId];
  else Object.keys(cache).forEach((k) => delete cache[k]);
}

function storageKey(tenantId?: string): string {
  return `${STORAGE_PREFIX}${tenantId ?? "default"}`;
}

export function clampSlaSettings(raw: Partial<SlaSettings>): SlaSettings {
  return {
    slaRiskRatio: Math.min(1, Math.max(0.5, raw.slaRiskRatio ?? DEFAULT_SLA_SETTINGS.slaRiskRatio)),
    batchRadiusKm: Math.min(
      10,
      Math.max(0.5, raw.batchRadiusKm ?? DEFAULT_SLA_SETTINGS.batchRadiusKm),
    ),
    congestionMode: raw.congestionMode === "manual" ? "manual" : "auto",
    congestionMultiplier: Math.min(
      3,
      Math.max(1, raw.congestionMultiplier ?? DEFAULT_SLA_SETTINGS.congestionMultiplier),
    ),
    kitchenBottleneckMin: Math.min(
      20,
      Math.max(
        2,
        Math.round(raw.kitchenBottleneckMin ?? DEFAULT_SLA_SETTINGS.kitchenBottleneckMin),
      ),
    ),
  };
}

export function getSlaSettings(tenantId?: string): SlaSettings {
  const key = tenantId ?? "default";
  if (cache[key]) return cache[key];

  if (typeof window === "undefined") return DEFAULT_SLA_SETTINGS;
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return DEFAULT_SLA_SETTINGS;
    const parsed = clampSlaSettings(JSON.parse(raw) as Partial<SlaSettings>);
    if (tenantId) cache[tenantId] = parsed;
    return parsed;
  } catch {
    return DEFAULT_SLA_SETTINGS;
  }
}

export function saveSlaSettingsLocal(
  tenantId: string | undefined,
  settings: SlaSettings,
): SlaSettings {
  const next = clampSlaSettings(settings);
  const key = tenantId ?? "default";
  cache[key] = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(tenantId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("sla-settings-updated", { detail: { tenantId } }));
  }
  return next;
}

export function resetSlaSettingsLocal(tenantId?: string): SlaSettings {
  const key = tenantId ?? "default";
  delete cache[key];
  if (typeof window !== "undefined") {
    localStorage.removeItem(storageKey(tenantId));
    window.dispatchEvent(new CustomEvent("sla-settings-updated", { detail: { tenantId } }));
  }
  return DEFAULT_SLA_SETTINGS;
}
