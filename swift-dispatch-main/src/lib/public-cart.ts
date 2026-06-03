import {
  cartLineKey,
  migrateLegacyCartItem,
  newLineId,
  type CartItem,
} from "@/lib/menu/cart-line";

export type { CartItem, CartAddonSelection } from "@/lib/menu/cart-line";

function key(slug: string) {
  return `delivery_cart_${slug}`;
}

export function getCart(tenantSlug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(sessionStorage.getItem(key(tenantSlug)) ?? "[]") as Record<
      string,
      unknown
    >[];
    return raw.map(migrateLegacyCartItem);
  } catch {
    return [];
  }
}

export function setCart(tenantSlug: string, items: CartItem[]) {
  sessionStorage.setItem(key(tenantSlug), JSON.stringify(items));
}

export function addToCart(tenantSlug: string, item: CartItem) {
  const cart = getCart(tenantSlug);
  const lineKey = cartLineKey(item);
  const existing = cart.find((c) => cartLineKey(c) === lineKey);
  if (existing) {
    existing.quantity += item.quantity;
    if (item.image_url && !existing.image_url) existing.image_url = item.image_url;
    if (item.notes) existing.notes = item.notes;
  } else {
    cart.push({ ...item, line_id: item.line_id || newLineId() });
  }
  setCart(tenantSlug, cart);
}

export function clearCart(tenantSlug: string) {
  sessionStorage.removeItem(key(tenantSlug));
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}

/** Quantidade total por produto (todas as linhas/variações). */
export function getCartQtyMap(items: CartItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const i of items) {
    map[i.menu_item_id] = (map[i.menu_item_id] ?? 0) + i.quantity;
  }
  return map;
}

export function setCartLine(tenantSlug: string, line: CartItem) {
  const cart = getCart(tenantSlug);
  const lineKey = cartLineKey(line);
  const idx = cart.findIndex((c) => cartLineKey(c) === lineKey);
  if (line.quantity <= 0) {
    setCart(
      tenantSlug,
      cart.filter((c) => cartLineKey(c) !== lineKey),
    );
    return;
  }
  const withId = { ...line, line_id: line.line_id || newLineId() };
  if (idx >= 0) cart[idx] = withId;
  else cart.push(withId);
  setCart(tenantSlug, cart);
}

export function updateCartNotes(tenantSlug: string, lineId: string, notes: string | undefined) {
  const cart = getCart(tenantSlug);
  const item = cart.find((c) => c.line_id === lineId);
  if (!item) return;
  const trimmed = notes?.trim();
  item.notes = trimmed || undefined;
  setCart(tenantSlug, cart);
}

export function updateCartQty(tenantSlug: string, lineId: string, delta: number) {
  const cart = getCart(tenantSlug);
  const next = cart
    .map((c) =>
      c.line_id === lineId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c,
    )
    .filter((c) => c.quantity > 0);
  setCart(tenantSlug, next);
}

export function removeCartLine(tenantSlug: string, lineId: string) {
  setCart(
    tenantSlug,
    getCart(tenantSlug).filter((c) => c.line_id !== lineId),
  );
}
