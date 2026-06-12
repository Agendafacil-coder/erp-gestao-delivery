import type { PrintFormat } from "./printSettings";

export type PrintHistoryEntry = {
  orderId: string;
  code: string;
  format: PrintFormat;
  at: string;
};

const STORAGE_PREFIX = "delivery-os-print-history:";
const MAX_ENTRIES = 12;

function storageKey(tenantId: string): string {
  return `${STORAGE_PREFIX}${tenantId}`;
}

export function getPrintHistory(tenantId: string | undefined): PrintHistoryEntry[] {
  if (!tenantId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrintHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordPrintHistory(
  tenantId: string,
  entry: Omit<PrintHistoryEntry, "at"> & { at?: string },
): PrintHistoryEntry[] {
  if (typeof window === "undefined") return [];
  const at = entry.at ?? new Date().toISOString();
  const next: PrintHistoryEntry[] = [
    { ...entry, at },
    ...getPrintHistory(tenantId).filter((e) => e.orderId !== entry.orderId),
  ].slice(0, MAX_ENTRIES);
  localStorage.setItem(storageKey(tenantId), JSON.stringify(next));
  return next;
}
