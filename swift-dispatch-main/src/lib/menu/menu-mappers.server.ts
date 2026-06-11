import { schema } from "@/db";
import type {
  MenuItemAddonDto,
  MenuItemDto,
  MenuItemVariationDto,
} from "@/functions/menu";
import { loadMenuItemExtras } from "@/lib/menu/menu-service";

function mapVariationRow(v: typeof schema.menuItemVariations.$inferSelect): MenuItemVariationDto {
  return {
    id: v.id,
    name: v.name,
    price: Number(v.price),
    sort_order: v.sortOrder,
  };
}

function mapAddonRow(a: typeof schema.menuItemAddons.$inferSelect): MenuItemAddonDto {
  return {
    id: a.id,
    name: a.name,
    price: Number(a.price),
    group_name: a.groupName ?? "Adicionais",
    required: a.required,
    max_quantity: a.maxQuantity,
    is_suggested: a.isSuggested,
    sort_order: a.sortOrder,
  };
}

export function mapMenuItemRow(
  row: typeof schema.menuItems.$inferSelect,
  variations: MenuItemVariationDto[] = [],
  addons: MenuItemAddonDto[] = [],
): MenuItemDto {
  return {
    id: row.id,
    category_id: row.categoryId,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image_url: row.imageUrl,
    available: row.available,
    sort_order: row.sortOrder,
    is_featured: row.isFeatured ?? false,
    is_combo: row.isCombo ?? false,
    is_drink: row.isDrink ?? false,
    sales_count: row.salesCount ?? 0,
    unit_cost: row.unitCost != null ? Number(row.unitCost) : null,
    stock_quantity: row.stockQuantity ?? null,
    stock_min: row.stockMin ?? 0,
    variations,
    addons,
  };
}

export async function mapMenuItemDtoFromRow(
  row: typeof schema.menuItems.$inferSelect,
): Promise<MenuItemDto> {
  const { variations, addons } = await loadMenuItemExtras([row.id]);
  return mapMenuItemRow(
    row,
    variations.map(mapVariationRow),
    addons.map(mapAddonRow),
  );
}
