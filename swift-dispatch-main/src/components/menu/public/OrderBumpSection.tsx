import { useEffect, useMemo, useState } from "react";
import type { MenuItemDto, PublicMenuPayload } from "@/functions/menu";
import { DrinkSuggestSheet } from "@/components/menu/public/DrinkSuggestSheet";
import {
  ProductDetailModal,
  type ProductConfirmPayload,
} from "@/components/menu/public/ProductDetailModal";
import { buildLineDisplayName, newLineId } from "@/lib/menu/cart-line";
import {
  canShowOrderBump,
  cartHasFoodWithoutDrink,
  dismissOrderBump,
  itemNeedsProductModal,
  listDrinkSuggestions,
  markOrderBumpShown,
} from "@/lib/menu/order-bump";
import { addToCart, type CartItem } from "@/lib/public-cart";
import { toast } from "sonner";

type OrderBumpSectionProps = {
  tenantSlug: string;
  menu: PublicMenuPayload | null;
  cartItems: CartItem[];
  onCartChange: () => void;
};

/** Fallback na sacola/checkout — só se o cliente ainda não viu o bump nesta sessão. */
export function OrderBumpSection({
  tenantSlug,
  menu,
  cartItems,
  onCartChange,
}: OrderBumpSectionProps) {
  const [open, setOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<MenuItemDto | null>(null);

  const suggestions = useMemo(
    () => (menu ? listDrinkSuggestions(menu, cartItems) : []),
    [menu, cartItems],
  );

  const eligible = useMemo(() => {
    if (!menu || !cartItems.length || !suggestions.length) return false;
    return cartHasFoodWithoutDrink(cartItems, menu);
  }, [menu, cartItems, suggestions.length]);

  useEffect(() => {
    if (!eligible) {
      setOpen(false);
      return;
    }
    if (!canShowOrderBump(tenantSlug)) return;

    const timer = window.setTimeout(() => setOpen(true), 350);
    return () => window.clearTimeout(timer);
  }, [eligible, tenantSlug]);

  const close = () => setOpen(false);

  const dismiss = () => {
    setOpen(false);
    dismissOrderBump(tenantSlug);
  };

  const pushLine = (payload: ProductConfirmPayload, item: MenuItemDto) => {
    addToCart(tenantSlug, {
      line_id: payload.line_id,
      menu_item_id: item.id,
      name: item.name,
      unit_price: payload.unit_price,
      quantity: payload.quantity,
      notes: payload.notes || undefined,
      image_url: item.image_url ?? undefined,
      variation_id: payload.variation_id,
      variation_name: payload.variation_name,
      addons: payload.addons.length ? payload.addons : undefined,
    });
    onCartChange();
    toast.success(`${buildLineDisplayName({
      line_id: payload.line_id,
      menu_item_id: item.id,
      name: item.name,
      unit_price: payload.unit_price,
      quantity: payload.quantity,
      notes: payload.notes,
      variation_id: payload.variation_id,
      variation_name: payload.variation_name,
      addons: payload.addons.length ? payload.addons : undefined,
    })} adicionado!`);
  };

  const handleAdd = (item: MenuItemDto) => {
    if (itemNeedsProductModal(item)) {
      setOpen(false);
      setDetailItem(item);
      return;
    }
    addToCart(tenantSlug, {
      line_id: newLineId(),
      menu_item_id: item.id,
      name: item.name,
      unit_price: item.price,
      quantity: 1,
      image_url: item.image_url ?? undefined,
    });
    onCartChange();
    toast.success(`${item.name} adicionado!`);
  };

  if (!menu) return null;

  return (
    <>
      <DrinkSuggestSheet
        drinks={suggestions}
        open={open && suggestions.length > 0}
        subtitle="Seu pedido ainda não tem bebida — escolha uma opção abaixo"
        dismissLabel="Continuar sem bebida"
        onClose={close}
        onDismiss={dismiss}
        onOpened={() => markOrderBumpShown(tenantSlug)}
        onAdd={handleAdd}
      />
      <ProductDetailModal
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        onConfirm={(payload) => {
          if (detailItem) pushLine(payload, detailItem);
          setDetailItem(null);
        }}
      />
    </>
  );
}
