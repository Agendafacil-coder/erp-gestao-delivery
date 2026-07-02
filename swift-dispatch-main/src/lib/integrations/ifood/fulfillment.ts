import type { IfoodWebhookPayload } from "./types";

/** DELIVERY | TAKEOUT | DINE_IN vindos do virtual-bag / webhook */
export function resolveIfoodFulfillmentType(payload: IfoodWebhookPayload): "delivery" | "pickup" {
  const raw = (payload.orderType ?? payload.type ?? payload.delivery?.mode ?? "")
    .toString()
    .toUpperCase();

  if (
    raw.includes("TAKEOUT") ||
    raw.includes("TAKE_OUT") ||
    raw.includes("DINE_IN") ||
    raw.includes("INDOOR") ||
    raw === "PICKUP"
  ) {
    return "pickup";
  }

  return "delivery";
}

export function ifoodPickupAddressLabel(storeName?: string | null): string {
  return storeName?.trim() ? `Retirada — ${storeName.trim()}` : "Retirada no balcão (iFood)";
}
