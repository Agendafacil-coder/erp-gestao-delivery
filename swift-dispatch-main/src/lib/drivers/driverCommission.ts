export type DriverCommissionType = "fixed" | "percent";

export type DriverCommissionSettings = {
  enabled: boolean;
  type: DriverCommissionType;
  /** Valor fixo R$ ou percentual sobre taxa de entrega */
  value: number;
};

export const DEFAULT_DRIVER_COMMISSION: DriverCommissionSettings = {
  enabled: false,
  type: "fixed",
  value: 5,
};

export function parseDriverCommissionJson(
  raw: string | null | undefined,
): DriverCommissionSettings {
  if (!raw?.trim()) return { ...DEFAULT_DRIVER_COMMISSION };
  try {
    const parsed = JSON.parse(raw) as Partial<DriverCommissionSettings>;
    return clampDriverCommission(parsed);
  } catch {
    return { ...DEFAULT_DRIVER_COMMISSION };
  }
}

export function serializeDriverCommission(settings: DriverCommissionSettings): string {
  return JSON.stringify(clampDriverCommission(settings));
}

export function clampDriverCommission(
  input: Partial<DriverCommissionSettings>,
): DriverCommissionSettings {
  const type = input.type === "percent" ? "percent" : "fixed";
  const value = Math.max(0, Number(input.value) || 0);
  return {
    enabled: Boolean(input.enabled),
    type,
    value: type === "percent" ? Math.min(100, value) : value,
  };
}

export function computeDriverCommission(
  settings: DriverCommissionSettings,
  deliveryFee: number,
): number {
  if (!settings.enabled || settings.value <= 0) return 0;
  if (settings.type === "percent") {
    return Math.round((deliveryFee * settings.value) / 100 * 100) / 100;
  }
  return settings.value;
}
