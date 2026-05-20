import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2, ChevronRight } from "lucide-react";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { formatBRL } from "@/lib/menu/format";
import { CartItemNotesButton } from "@/components/menu/public/CartItemNotesButton";
import {
  cartTotal,
  getCart,
  updateCartNotes,
  updateCartQty,
  setCart,
  type CartItem,
} from "@/lib/public-cart";

export const Route = createFileRoute("/$tenantSlug/carrinho")({
  component: CartPage,
});

function CartPage() {
  const { tenantSlug } = Route.useParams();
  const [items, setItems] = useState<CartItem[]>(() => getCart(tenantSlug));

  const refresh = () => setItems(getCart(tenantSlug));

  const updateQty = (id: string, delta: number) => {
    updateCartQty(tenantSlug, id, delta);
    refresh();
  };

  const removeLine = (id: string) => {
    setCart(
      tenantSlug,
      items.filter((i) => i.menu_item_id !== id),
    );
    refresh();
  };

  const total = cartTotal(items);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <MenuLightShell
      tenantSlug={tenantSlug}
      title="Sua sacola"
      subtitle={count > 0 ? `${count} ${count === 1 ? "item" : "itens"} na sacola` : undefined}
      cartCount={count}
      cartTotal={total}
      showBack
    >
      <main className="max-w-lg mx-auto px-4 py-5 pb-36">
        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#888] text-sm mb-6">Sua sacola está vazia</p>
            <Link
              to="/$tenantSlug"
              params={{ tenantSlug }}
              className="inline-flex items-center gap-2 text-[#ea1d2c] font-semibold text-sm"
            >
              Ver cardápio
              <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.menu_item_id}
                className="rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <div className="flex gap-3">
                  <div className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-[#f5f5f7]">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-gradient-to-br from-[#fff8f0] to-[#ffe8e0] text-2xl">
                        🍔
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-semibold leading-snug text-[#1c1c1e]">
                          {item.name}
                        </h3>
                        {item.notes ? (
                          <p className="mt-1 text-xs leading-snug text-[#6b6b6f] line-clamp-2">
                            {item.notes}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <CartItemNotesButton
                            notes={item.notes}
                            onSave={(text) => {
                              updateCartNotes(tenantSlug, item.menu_item_id, text);
                              refresh();
                            }}
                          />
                          <span className="text-sm text-[#888]">
                            {formatBRL(item.unit_price)} cada
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(item.menu_item_id)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#ccc] hover:bg-[#fff5f5] hover:text-[#ea1d2c]"
                        aria-label="Remover"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <p className="font-bold tabular-nums text-[#1c1c1e]">
                        {formatBRL(item.unit_price * item.quantity)}
                      </p>
                      <div className="flex items-center gap-1 rounded-full bg-[#f0f0f2] p-1">
                        <button
                          type="button"
                          onClick={() => updateQty(item.menu_item_id, -1)}
                          className="flex size-8 items-center justify-center rounded-full bg-white text-[#555] shadow-sm"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-[28px] text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.menu_item_id, 1)}
                          className="flex size-8 items-center justify-center rounded-full bg-[#ea1d2c] text-white"
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
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-[#f7f7f8] via-[#f7f7f8] to-transparent">
          <div className="max-w-lg mx-auto space-y-2">
            <div className="flex justify-between text-sm px-1 text-[#888]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#1c1c1e]">{formatBRL(total)}</span>
            </div>
            <Link
              to="/$tenantSlug/checkout"
              params={{ tenantSlug }}
              className="flex items-center justify-center gap-2 w-full rounded-2xl bg-[#ea1d2c] text-white py-4 font-semibold shadow-[0_8px_32px_rgba(234,29,44,0.35)]"
            >
              Continuar
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </div>
      )}
    </MenuLightShell>
  );
}
