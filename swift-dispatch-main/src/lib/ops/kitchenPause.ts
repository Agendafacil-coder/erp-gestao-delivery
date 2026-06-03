const storageKey = (tenantId: string) => `kds-paused-${tenantId}`;

export function getKitchenPausedIds(tenantId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as string[];
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

export function isKitchenPaused(tenantId: string, orderId: string): boolean {
  return getKitchenPausedIds(tenantId).has(orderId);
}

export function setKitchenPaused(tenantId: string, orderId: string, paused: boolean): void {
  if (typeof window === "undefined") return;
  const set = getKitchenPausedIds(tenantId);
  if (paused) set.add(orderId);
  else set.delete(orderId);
  localStorage.setItem(storageKey(tenantId), JSON.stringify([...set]));
}

export function clearKitchenPausedForTerminal(tenantId: string, orderId: string): void {
  setKitchenPaused(tenantId, orderId, false);
}
