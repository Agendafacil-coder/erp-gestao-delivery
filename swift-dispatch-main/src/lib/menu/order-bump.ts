import type { MenuItemDto, PublicMenuPayload } from "@/functions/menu";
import type { CartItem } from "@/lib/public-cart";

export function buildCategoryNameByItemId(menu: PublicMenuPayload): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of menu.categories) {
    for (const item of category.items) {
      map.set(item.id, category.name);
    }
  }
  return map;
}

export function findMenuItem(menu: PublicMenuPayload, itemId: string): MenuItemDto | undefined {
  for (const category of menu.categories) {
    const item = category.items.find((i) => i.id === itemId);
    if (item) return item;
  }
  return (
    menu.drinks.find((i) => i.id === itemId) ??
    menu.featured.find((i) => i.id === itemId) ??
    menu.combos.find((i) => i.id === itemId)
  );
}

export function isMenuDrinkItem(item: MenuItemDto, categoryName = ""): boolean {
  if (item.is_drink) return true;
  const category = categoryName.toLowerCase();
  return category.includes("bebida") || category.includes("drink");
}

export function cartHasDrink(
  cartItems: CartItem[],
  menu: PublicMenuPayload,
  categoryByItemId = buildCategoryNameByItemId(menu),
): boolean {
  const drinkIds = new Set(menu.drinks.map((d) => d.id));
  return cartItems.some((line) => {
    const menuItem = findMenuItem(menu, line.menu_item_id);
    const categoryName = categoryByItemId.get(line.menu_item_id) ?? "";
    if (menuItem) return isMenuDrinkItem(menuItem, categoryName);
    return drinkIds.has(line.menu_item_id);
  });
}

/** Sacola com comida e sem bebida — momento ideal para order bump */
export function cartHasFoodWithoutDrink(
  cartItems: CartItem[],
  menu: PublicMenuPayload,
  categoryByItemId = buildCategoryNameByItemId(menu),
): boolean {
  if (!cartItems.length) return false;

  let hasFood = false;
  const drinkIds = new Set(menu.drinks.map((d) => d.id));

  for (const line of cartItems) {
    const menuItem = findMenuItem(menu, line.menu_item_id);
    const categoryName = categoryByItemId.get(line.menu_item_id) ?? "";
    const isDrink = menuItem
      ? isMenuDrinkItem(menuItem, categoryName)
      : drinkIds.has(line.menu_item_id);

    if (isDrink) return false;
    hasFood = true;
  }

  return hasFood;
}

export function itemNeedsProductModal(item: MenuItemDto): boolean {
  return item.variations.length > 0 || item.addons.length > 0;
}

export function pickOrderBumpItem(menu: PublicMenuPayload, cartItems: CartItem[]): MenuItemDto | null {
  if (!menu.drinks.length || !cartItems.length) return null;
  if (!cartHasFoodWithoutDrink(cartItems, menu)) return null;

  const inCart = new Set(cartItems.map((i) => i.menu_item_id));
  return (
    menu.drinks
      .filter((d) => d.available && !inCart.has(d.id))
      .sort((a, b) => a.price - b.price)[0] ?? null
  );
}

export function listDrinkSuggestions(
  menu: PublicMenuPayload,
  cartItems: CartItem[],
  limit = 5,
): MenuItemDto[] {
  const inCart = new Set(cartItems.map((i) => i.menu_item_id));
  return menu.drinks
    .filter((d) => d.available && !inCart.has(d.id))
    .sort((a, b) => a.price - b.price)
    .slice(0, limit);
}

export function shouldSuggestDrinkAfterAdd(
  item: MenuItemDto,
  menu: PublicMenuPayload,
  categoryName = "",
): boolean {
  return !isMenuDrinkItem(item, categoryName) && menu.drinks.length > 0;
}

function bumpDismissKey(tenantSlug: string) {
  return `delivery_bump_dismiss_${tenantSlug}`;
}

function bumpShownKey(tenantSlug: string) {
  return `delivery_bump_shown_${tenantSlug}`;
}

export function isOrderBumpDismissed(tenantSlug: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(bumpDismissKey(tenantSlug)) === "1";
}

export function wasOrderBumpShown(tenantSlug: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(bumpShownKey(tenantSlug)) === "1";
}

export function canShowOrderBumpSession(state: {
  shown: boolean;
  dismissed: boolean;
}): boolean {
  return !state.dismissed && !state.shown;
}

/** Pode exibir bump (cardápio ou fallback na sacola) nesta sessão */
export function canShowOrderBump(tenantSlug: string): boolean {
  return canShowOrderBumpSession({
    shown: wasOrderBumpShown(tenantSlug),
    dismissed: isOrderBumpDismissed(tenantSlug),
  });
}

export function markOrderBumpShown(tenantSlug: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(bumpShownKey(tenantSlug), "1");
}

export function dismissOrderBump(tenantSlug: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(bumpDismissKey(tenantSlug), "1");
  sessionStorage.setItem(bumpShownKey(tenantSlug), "1");
}

/** Nova sacola — permite o bump de novo nesta sessão do navegador */
export function clearOrderBumpSession(tenantSlug: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(bumpDismissKey(tenantSlug));
  sessionStorage.removeItem(bumpShownKey(tenantSlug));
}
