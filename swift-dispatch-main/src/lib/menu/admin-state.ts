import type { MenuItemDto, PublicMenuPayload } from "@/functions/menu";

function sortByOrder(items: MenuItemDto[]): MenuItemDto[] {
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

export function findMenuItem(
  menu: PublicMenuPayload,
  itemId: string,
): { item: MenuItemDto; categoryId: string } | null {
  for (const cat of menu.categories) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) return { item, categoryId: cat.id };
  }
  return null;
}

/** Atualiza ou move um item entre categorias no payload em memória. */
export function setMenuItemInPayload(
  menu: PublicMenuPayload,
  itemId: string,
  next: MenuItemDto,
  categoryId: string,
): PublicMenuPayload {
  const categories = menu.categories.map((cat) => ({
    ...cat,
    items: cat.items.filter((i) => i.id !== itemId),
  }));
  const target = categories.find((c) => c.id === categoryId);
  if (!target) return menu;
  target.items = sortByOrder([...target.items, next]);
  return { ...menu, categories };
}

/** Reordena itens visíveis na aba e mantém os demais ao final da categoria. */
export function reorderDisplayedInCategory(
  menu: PublicMenuPayload,
  categoryId: string,
  displayedOrderedIds: string[],
): { menu: PublicMenuPayload; fullOrderedIds: string[] } {
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (!cat) return { menu, fullOrderedIds: [] };

  const displayedSet = new Set(displayedOrderedIds);
  const hidden = sortByOrder(cat.items.filter((i) => !displayedSet.has(i.id)));
  const displayed = displayedOrderedIds
    .map((id, index) => {
      const item = cat.items.find((i) => i.id === id);
      return item ? { ...item, sort_order: index } : null;
    })
    .filter((i): i is MenuItemDto => i !== null);

  const offset = displayed.length;
  const hiddenUpdated = hidden.map((item, i) => ({ ...item, sort_order: offset + i }));
  const merged = sortByOrder([...displayed, ...hiddenUpdated]);
  const fullOrderedIds = merged.map((i) => i.id);

  return {
    menu: {
      ...menu,
      categories: menu.categories.map((c) =>
        c.id === categoryId ? { ...c, items: merged } : c,
      ),
    },
    fullOrderedIds,
  };
}

export function removeMenuItemFromPayload(
  menu: PublicMenuPayload,
  itemId: string,
): PublicMenuPayload {
  return {
    ...menu,
    categories: menu.categories.map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => i.id !== itemId),
    })),
  };
}

export function addMenuItemToPayload(
  menu: PublicMenuPayload,
  item: MenuItemDto,
  categoryId: string,
): PublicMenuPayload {
  return setMenuItemInPayload(menu, item.id, item, categoryId);
}

export function parsePriceInput(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  const value = parseFloat(normalized);
  if (Number.isNaN(value) || value < 0) return null;
  return value;
}
