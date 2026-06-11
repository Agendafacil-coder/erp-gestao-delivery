export type MenuStockLine = { menu_item_id: string; quantity: number };

export type MenuStockItem = {
  id: string;
  name: string;
  available: boolean;
  stockQuantity: number | null;
};

export function isMenuItemLowStock(
  stockQuantity: number | null | undefined,
  stockMin: number | null | undefined,
): boolean {
  if (stockQuantity == null) return false;
  return stockQuantity <= (stockMin ?? 0);
}

export function aggregateMenuItemQuantities(lines: MenuStockLine[]): Map<string, number> {
  const qtyByItem = new Map<string, number>();
  for (const line of lines) {
    qtyByItem.set(line.menu_item_id, (qtyByItem.get(line.menu_item_id) ?? 0) + line.quantity);
  }
  return qtyByItem;
}

export function validateMenuStock(items: MenuStockItem[], qtyByItem: Map<string, number>): void {
  const itemMap = new Map(items.map((i) => [i.id, i]));
  for (const [menuItemId, qty] of qtyByItem) {
    const item = itemMap.get(menuItemId);
    if (!item) throw new Error("Produto não encontrado no cardápio");
    if (!item.available) throw new Error(`Produto indisponível: ${item.name}`);
    if (item.stockQuantity != null && qty > item.stockQuantity) {
      throw new Error(
        item.stockQuantity === 0
          ? `${item.name} esgotou — remova da sacola`
          : `Estoque insuficiente de ${item.name} (máx. ${item.stockQuantity})`,
      );
    }
  }
}
