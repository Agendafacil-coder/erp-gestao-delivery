import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { CartLine } from "@/functions/publicOrders";
import { buildLineDisplayName } from "@/lib/menu/cart-line";
import {
  aggregateMenuItemQuantities,
  validateMenuStock,
} from "@/lib/menu/menu-stock";
import {
  applyCoupon,
  DEFAULT_MENU_SETTINGS,
  findCoupon,
  mapTenantMenuSettingsRow,
  resolveDeliveryFee,
  type TenantMenuSettingsDto,
} from "@/lib/menu/public-settings";

export type PricedLine = {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  notes?: string;
};

export type OrderQuoteInput = {
  tenantSlug: string;
  lines: CartLine[];
  fulfillment_type: "delivery" | "pickup";
  neighborhood?: string;
  coupon_code?: string;
};

export type OrderQuoteResult = {
  lines: PricedLine[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  min_order_amount: number;
  meets_minimum: boolean;
  coupon_label: string | null;
  settings: TenantMenuSettingsDto;
};

async function loadMenuSettings(
  db: ReturnType<typeof getDb>,
  tenantId: string,
): Promise<TenantMenuSettingsDto> {
  const [row] = await db
    .select()
    .from(schema.tenantMenuSettings)
    .where(eq(schema.tenantMenuSettings.tenantId, tenantId))
    .limit(1);

  if (!row) return DEFAULT_MENU_SETTINGS;
  return mapTenantMenuSettingsRow(row);
}

export async function quotePublicOrder(data: OrderQuoteInput): Promise<OrderQuoteResult> {
  const db = getDb();
  const [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, data.tenantSlug))
    .limit(1);

  if (!tenant) throw new Error("Restaurante não encontrado");
  if (!data.lines.length) throw new Error("Carrinho vazio");

  const settings = await loadMenuSettings(db, tenant.id);
  const itemIds = [...new Set(data.lines.map((l) => l.menu_item_id))];

  const items = await db
    .select()
    .from(schema.menuItems)
    .where(
      and(eq(schema.menuItems.tenantId, tenant.id), inArray(schema.menuItems.id, itemIds)),
    );

  const variations = await db
    .select()
    .from(schema.menuItemVariations)
    .where(inArray(schema.menuItemVariations.menuItemId, itemIds));

  const addons = await db
    .select()
    .from(schema.menuItemAddons)
    .where(inArray(schema.menuItemAddons.menuItemId, itemIds));

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const qtyByItem = aggregateMenuItemQuantities(data.lines);
  validateMenuStock(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      available: i.available,
      stockQuantity: i.stockQuantity,
    })),
    qtyByItem,
  );

  const priced: PricedLine[] = [];

  for (const line of data.lines) {
    const item = itemMap.get(line.menu_item_id);
    if (!item || !item.available) throw new Error(`Produto indisponível: ${line.name}`);

    let unit = Number(item.price);
    if (line.variation_id) {
      const v = variations.find(
        (x) => x.id === line.variation_id && x.menuItemId === line.menu_item_id && x.available,
      );
      if (!v) throw new Error(`Variação inválida para ${item.name}`);
      unit = Number(v.price);
    }

    for (const sel of line.addons ?? []) {
      const addon = addons.find(
        (a) => a.id === sel.id && a.menuItemId === line.menu_item_id && a.available,
      );
      if (!addon) throw new Error(`Adicional inválido em ${item.name}`);
      const qty = Math.min(sel.quantity, addon.maxQuantity);
      unit += Number(addon.price) * qty;
    }

    unit = Math.round(unit * 100) / 100;
    priced.push({
      menu_item_id: line.menu_item_id,
      name: buildLineDisplayName({
        line_id: "",
        menu_item_id: line.menu_item_id,
        name: item.name,
        unit_price: unit,
        quantity: line.quantity,
        variation_name: line.variation_name,
        addons: line.addons,
      }),
      quantity: line.quantity,
      unit_price: unit,
      notes: line.notes,
    });
  }

  const subtotal = priced.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const deliveryFee =
    data.fulfillment_type === "delivery"
      ? resolveDeliveryFee(settings, data.neighborhood)
      : 0;

  const coupon = findCoupon(settings, data.coupon_code);
  const { discount, label } = applyCoupon(subtotal, coupon);
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const minOrder = settings.min_order_amount;

  return {
    lines: priced,
    subtotal,
    delivery_fee: deliveryFee,
    discount,
    total,
    min_order_amount: minOrder,
    meets_minimum: subtotal >= minOrder,
    coupon_label: label,
    settings,
  };
}
