export type CartItem = {
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  notes?: string;
  image_url?: string | null;
};

function key(slug: string) {
  return `delivery_cart_${slug}`;
}

export function getCart(tenantSlug: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(key(tenantSlug)) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

export function setCart(tenantSlug: string, items: CartItem[]) {
  sessionStorage.setItem(key(tenantSlug), JSON.stringify(items));
}

export function addToCart(tenantSlug: string, item: CartItem) {
  const cart = getCart(tenantSlug);
  const existing = cart.find((c) => c.menu_item_id === item.menu_item_id);
  if (existing) {
    existing.quantity += item.quantity;
    if (item.image_url && !existing.image_url) {
      existing.image_url = item.image_url;
    }
    if (item.notes) existing.notes = item.notes;
  } else {
    cart.push(item);
  }
  setCart(tenantSlug, cart);
}

export function clearCart(tenantSlug: string) {
  sessionStorage.removeItem(key(tenantSlug));
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
}

export function getCartQtyMap(items: CartItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const i of items) map[i.menu_item_id] = i.quantity;
  return map;
}

/** Define quantidade e observações de uma linha (substitui a linha existente). */
export function setCartLine(tenantSlug: string, line: CartItem) {
  const cart = getCart(tenantSlug);
  const idx = cart.findIndex((c) => c.menu_item_id === line.menu_item_id);
  if (line.quantity <= 0) {
    setCart(
      tenantSlug,
      cart.filter((c) => c.menu_item_id !== line.menu_item_id),
    );
    return;
  }
  if (idx >= 0) {
    cart[idx] = line;
  } else {
    cart.push(line);
  }
  setCart(tenantSlug, cart);
}

export function updateCartNotes(
  tenantSlug: string,
  menuItemId: string,
  notes: string | undefined,
) {
  const cart = getCart(tenantSlug);
  const item = cart.find((c) => c.menu_item_id === menuItemId);
  if (!item) return;
  const trimmed = notes?.trim();
  item.notes = trimmed || undefined;
  setCart(tenantSlug, cart);
}

export function updateCartQty(tenantSlug: string, menuItemId: string, delta: number) {
  const cart = getCart(tenantSlug);
  const existing = cart.find((c) => c.menu_item_id === menuItemId);
  if (!existing && delta > 0) return;
  const next = cart
    .map((c) =>
      c.menu_item_id === menuItemId
        ? { ...c, quantity: Math.max(0, c.quantity + delta) }
        : c,
    )
    .filter((c) => c.quantity > 0);
  setCart(tenantSlug, next);
}
