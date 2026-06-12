import type { MenuItemDto } from "@/functions/menu";
import type { CartItem } from "@/lib/public-cart";
import { findMenuItem } from "@/lib/menu/order-bump";

export type SmartUpsellSuggestion = {
  menu_item_id: string;
  name: string;
  price: number;
  image_url: string | null;
  reason: string;
};

export function rankCoPurchaseCounts(
  pairs: Array<{ menu_item_id: string; count: number }>,
  cartItemIds: Set<string>,
  menuItems: Map<string, MenuItemDto>,
  limit: number,
): SmartUpsellSuggestion[] {
  const results: SmartUpsellSuggestion[] = [];

  for (const row of pairs) {
    if (cartItemIds.has(row.menu_item_id)) continue;
    const item = menuItems.get(row.menu_item_id);
    if (!item || !item.available) continue;

    results.push({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      reason: "Quem levou itens parecidos também pediu",
    });

    if (results.length >= limit) break;
  }

  return results;
}

/** Fallback quando não há histórico — complementos baratos fora do carrinho */
export function fallbackUpsellFromMenu(
  menuItems: MenuItemDto[],
  cartItemIds: Set<string>,
  limit: number,
): SmartUpsellSuggestion[] {
  return menuItems
    .filter((item) => item.available && !cartItemIds.has(item.id))
    .sort((a, b) => a.price - b.price)
    .slice(0, limit)
    .map((item) => ({
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      reason: "Combina com seu pedido",
    }));
}

export function mergeUpsellSuggestions(
  coPurchase: SmartUpsellSuggestion[],
  fallback: SmartUpsellSuggestion[],
  limit: number,
): SmartUpsellSuggestion[] {
  const seen = new Set<string>();
  const merged: SmartUpsellSuggestion[] = [];

  for (const item of [...coPurchase, ...fallback]) {
    if (seen.has(item.menu_item_id)) continue;
    seen.add(item.menu_item_id);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}

export function pickSmartUpsellForCart(
  cartItems: CartItem[],
  menuItems: MenuItemDto[],
  coPurchasePairs: Array<{ menu_item_id: string; count: number }>,
  limit = 3,
): SmartUpsellSuggestion[] {
  const cartIds = new Set(cartItems.map((i) => i.menu_item_id));
  const itemMap = new Map(menuItems.map((i) => [i.id, i]));

  const fromHistory = rankCoPurchaseCounts(coPurchasePairs, cartIds, itemMap, limit);
  if (fromHistory.length >= limit) return fromHistory;

  const fallback = fallbackUpsellFromMenu(menuItems, cartIds, limit);
  return mergeUpsellSuggestions(fromHistory, fallback, limit);
}

export function flattenMenuItems(
  menu: { categories: Array<{ items: MenuItemDto[] }>; drinks: MenuItemDto[]; featured: MenuItemDto[]; combos: MenuItemDto[] },
): MenuItemDto[] {
  const all: MenuItemDto[] = [];
  for (const cat of menu.categories) all.push(...cat.items);
  all.push(...menu.drinks, ...menu.featured, ...menu.combos);
  return all;
}

export function findMenuItemInPayload(
  menu: Parameters<typeof flattenMenuItems>[0],
  itemId: string,
): MenuItemDto | undefined {
  return findMenuItem(menu as Parameters<typeof findMenuItem>[0], itemId);
}
