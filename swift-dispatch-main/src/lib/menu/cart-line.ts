import type { MenuItemAddonDto, MenuItemVariationDto } from "@/functions/menu";

export type CartAddonSelection = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type CartItem = {
  line_id: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  notes?: string;
  image_url?: string | null;
  variation_id?: string;
  variation_name?: string;
  addons?: CartAddonSelection[];
};

export function newLineId(): string {
  return crypto.randomUUID();
}

export function buildLineDisplayName(item: CartItem): string {
  const parts = [item.name];
  if (item.variation_name) parts.push(item.variation_name);
  const addonNames = item.addons?.filter((a) => a.quantity > 0).map((a) => a.name);
  if (addonNames?.length) parts.push(`+ ${addonNames.join(", ")}`);
  return parts.join(" · ");
}

export function computeUnitPrice(
  basePrice: number,
  variation: MenuItemVariationDto | undefined,
  addons: CartAddonSelection[],
): number {
  const base = variation ? variation.price : basePrice;
  const addonTotal = addons.reduce((s, a) => s + a.price * a.quantity, 0);
  return Math.round((base + addonTotal) * 100) / 100;
}

export function cartLineKey(item: CartItem): string {
  const addonKey = (item.addons ?? [])
    .map((a) => `${a.id}:${a.quantity}`)
    .sort()
    .join(",");
  return `${item.menu_item_id}|${item.variation_id ?? ""}|${addonKey}|${item.notes ?? ""}`;
}

export function migrateLegacyCartItem(raw: Record<string, unknown>): CartItem {
  const lineId =
    typeof raw.line_id === "string" ? raw.line_id : newLineId();
  return {
    line_id: lineId,
    menu_item_id: String(raw.menu_item_id),
    name: String(raw.name),
    unit_price: Number(raw.unit_price),
    quantity: Number(raw.quantity),
    notes: raw.notes ? String(raw.notes) : undefined,
    image_url: raw.image_url != null ? String(raw.image_url) : null,
    variation_id: raw.variation_id ? String(raw.variation_id) : undefined,
    variation_name: raw.variation_name ? String(raw.variation_name) : undefined,
    addons: Array.isArray(raw.addons)
      ? (raw.addons as CartAddonSelection[])
      : undefined,
  };
}
