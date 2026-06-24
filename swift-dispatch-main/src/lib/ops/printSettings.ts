export type PrintFormat = "delivery" | "kitchen";

export type PrintMode = "browser" | "thermal";

export type PrintSettings = {
  format: PrintFormat;
  copies: number;
  autoPrintKds: boolean;
  printMode: PrintMode;
};

const STORAGE_PREFIX = "delivery-os-print-settings:";

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  format: "kitchen",
  copies: 1,
  autoPrintKds: false,
  printMode: "browser",
};

function storageKey(tenantId: string): string {
  return `${STORAGE_PREFIX}${tenantId}`;
}

export function loadPrintSettings(tenantId: string | undefined): PrintSettings {
  if (!tenantId || typeof window === "undefined") return DEFAULT_PRINT_SETTINGS;
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return DEFAULT_PRINT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PrintSettings>;
    return {
      format: parsed.format === "delivery" ? "delivery" : "kitchen",
      copies: clampCopies(parsed.copies),
      autoPrintKds: Boolean(parsed.autoPrintKds),
      printMode: parsed.printMode === "thermal" ? "thermal" : "browser",
    };
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
}

export function savePrintSettings(
  tenantId: string,
  patch: Partial<PrintSettings>,
): PrintSettings {
  const next = { ...loadPrintSettings(tenantId), ...patch };
  next.copies = clampCopies(next.copies);
  if (typeof window !== "undefined") {
    localStorage.setItem(storageKey(tenantId), JSON.stringify(next));
  }
  return next;
}

export function clampCopies(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, Math.round(n)));
}

export const PRINT_FORMAT_LABEL: Record<PrintFormat, string> = {
  kitchen: "Comanda cozinha",
  delivery: "Etiqueta entrega",
};
