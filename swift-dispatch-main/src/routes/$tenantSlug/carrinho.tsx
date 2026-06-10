import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getPublicMenuFn, type PublicMenuPayload } from "@/functions/menu";
import { OrderBumpCard } from "@/components/menu/public/OrderBumpCard";
import { newLineId } from "@/lib/menu/cart-line";
import { addToCart } from "@/lib/public-cart";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ChevronRight, ShoppingBag } from "lucide-react";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { MenuStickyFooter } from "@/components/menu/public/MenuStickyFooter";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/menu/format";
import { CartItemNotesButton } from "@/components/menu/public/CartItemNotesButton";
import { buildLineDisplayName } from "@/lib/menu/cart-line";
import {
  cartTotal,
  cartItemCount,
  getCart,
  updateCartNotes,
  updateCartQty,
  removeCartLine,
  type CartItem,
} from "@/lib/public-cart";

export const Route = createFileRoute("/$tenantSlug/carrinho")({
  component: CartPage,
});

function CartPage() {
  const { tenantSlug } = Route.useParams();
  const [items, setItems] = useState<CartItem[]>(() => getCart(tenantSlug));
  const [menu, setMenu] = useState<PublicMenuPayload | null>(null);

  const refresh = () => setItems(getCart(tenantSlug));

  useEffect(() => {
    refresh();
  }, [tenantSlug]);

  useEffect(() => {
    void getPublicMenuFn({ data: { tenantSlug } }).then(setMenu).catch(() => {});
  }, [tenantSlug]);

  const bumpItem = useMemo(() => {
    if (!menu?.drinks?.length || !items.length) return null;
    const inCart = new Set(items.map((i) => i.menu_item_id));
    return (
      menu.drinks
        .filter((d) => d.available && !inCart.has(d.id))
        .sort((a, b) => a.price - b.price)[0] ?? null
    );
  }, [menu, items]);

  const total = cartTotal(items);
  const count = cartItemCount(items);

  return (
    <MenuLightShell
      tenantSlug={tenantSlug}
      title="Sua sacola"
      subtitle={count > 0 ? `${count} ${count === 1 ? "item" : "itens"} na sacola` : undefined}
      cartCount={count}
      cartTotal={total}
      showBack
      hideFloatingCart
    >
      <main className={cn("mx-auto w-full px-4 py-5 pb-36", MENU_PAGE_MAX)}>
        {items.length === 0 ? (
          <div className="menu-empty-state">
            <div className="menu-empty-state__icon">
              <ShoppingBag className="size-8" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-lg font-semibold">Sacola vazia</h2>
            <p className="mt-2 max-w-[16rem] text-sm text-[var(--menu-muted)]">
              Adicione itens do cardápio para continuar com seu pedido.
            </p>
            <Link
              to="/$tenantSlug"
              params={{ tenantSlug }}
              className="menu-btn-primary mt-6 inline-flex gap-2 px-6"
            >
              Ver cardápio
              <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {bumpItem ? (
              <li>
                <OrderBumpCard
                  item={bumpItem}
                  onAdd={() => {
                    addToCart(tenantSlug, {
                      line_id: newLineId(),
                      menu_item_id: bumpItem.id,
                      name: bumpItem.name,
                      unit_price: bumpItem.price,
                      quantity: 1,
                      image_url: bumpItem.image_url ?? undefined,
                    });
                    refresh();
                    toast.success(`${bumpItem.name} adicionado!`);
                  }}
                />
              </li>
            ) : null}
            {items.map((item) => (
              <li key={item.line_id} className="menu-card p-3">
                <div className="flex gap-3">
                  <div className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-[var(--menu-surface)] ring-1 ring-[var(--menu-border)]">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-2xl">🍔</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold leading-snug">
                          {buildLineDisplayName(item)}
                        </h3>
                        {item.notes ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-[var(--menu-muted)]">
                            Obs: {item.notes}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <CartItemNotesButton
                            notes={item.notes}
                            onSave={(text) => {
                              updateCartNotes(tenantSlug, item.line_id, text);
                              refresh();
                            }}
                          />
                          <span className="text-sm text-[var(--menu-muted)]">
                            {formatBRL(item.unit_price)} cada
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeCartLine(tenantSlug, item.line_id);
                          refresh();
                        }}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--menu-muted)] hover:bg-[var(--menu-accent)]/10 hover:text-[var(--menu-accent)]"
                        aria-label="Remover"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <p className="font-bold tabular-nums">{formatBRL(item.unit_price * item.quantity)}</p>
                      <div className="flex items-center gap-1 rounded-full bg-[var(--menu-surface)] p-1 ring-1 ring-[var(--menu-border)]">
                        <button
                          type="button"
                          onClick={() => {
                            updateCartQty(tenantSlug, item.line_id, -1);
                            refresh();
                          }}
                          className="flex size-8 items-center justify-center rounded-full bg-[var(--menu-card)] text-[var(--menu-muted)]"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-[28px] text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            updateCartQty(tenantSlug, item.line_id, 1);
                            refresh();
                          }}
                          className="flex size-8 items-center justify-center rounded-full bg-[var(--menu-gradient)] text-white"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {items.length > 0 && (
        <MenuStickyFooter className="space-y-2">
          <div className="flex justify-between px-1 text-sm">
            <span className="text-[var(--menu-muted)]">Subtotal</span>
            <span className="font-bold tabular-nums">{formatBRL(total)}</span>
          </div>
          <Link
            to="/$tenantSlug/checkout"
            params={{ tenantSlug }}
            className="menu-btn-primary flex w-full items-center justify-center gap-2 py-4"
          >
            Finalizar pedido
            <ChevronRight className="size-5" />
          </Link>
        </MenuStickyFooter>
      )}
    </MenuLightShell>
  );
}
