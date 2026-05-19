export type KpiId =
  | "active"
  | "drivers"
  | "avgEta"
  | "delayRate"
  | "delayed"
  | "billing"
  | "critical";

export const ALL_KPI_IDS: KpiId[] = [
  "active",
  "drivers",
  "avgEta",
  "delayRate",
  "delayed",
  "billing",
  "critical",
];

export const DEFAULT_VISIBLE_KPIS: KpiId[] = ["active", "delayed", "drivers", "critical"];

const STORAGE_KEY = "delivery_os_visible_kpis";

export function loadVisibleKpis(): KpiId[] {
  if (typeof window === "undefined") return DEFAULT_VISIBLE_KPIS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBLE_KPIS;
    const parsed = JSON.parse(raw) as KpiId[];
    const valid = parsed.filter((id) => ALL_KPI_IDS.includes(id));
    return valid.length > 0 ? valid : DEFAULT_VISIBLE_KPIS;
  } catch {
    return DEFAULT_VISIBLE_KPIS;
  }
}

export function saveVisibleKpis(ids: KpiId[]) {
  if (typeof window === "undefined") return;
  const valid = ids.filter((id) => ALL_KPI_IDS.includes(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(valid.length > 0 ? valid : DEFAULT_VISIBLE_KPIS));
}
