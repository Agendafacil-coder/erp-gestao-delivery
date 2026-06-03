import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ChevronRight } from "lucide-react";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
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

  const refresh = () => setItems(getCart(tenantSlug));

  useEffect(() => {
    refresh();
  }, [tenantSlug]);

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
    >
      <main className="mx-auto max-w-lg px-4 py-5 pb-36">
        {items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="mb-6 text-sm text-[#888]">Sua sacola está vazia</p>
            <Link
              to="/$tenantSlug"
              params={{ tenantSlug }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#ea1d2c]"
            >
              Ver cardápio
              <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.line_id}
                className="rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <div className="flex gap-3">
                  <div className="size-[72px] shrink-0 overflow-hidden rounded-xl bg-[#f5f5f7]">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="size-full object-cover" />
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
                          {buildLineDisplayName(item)}
                        </h3>
                        {item.notes ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#6b6b6f]">
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
                          <span className="text-sm text-[#888]">
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
                          onClick={() => {
                            updateCartQty(tenantSlug, item.line_id, -1);
                            refresh();
                          }}
                          className="flex size-8 items-center justify-center rounded-full bg-white text-[#555] shadow-sm"
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
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#f7f7f8] via-[#f7f7f8] to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg space-y-2">
            <div className="flex justify-between px-1 text-sm text-[#888]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#1c1c1e]">{formatBRL(total)}</span>
            </div>
            <Link
              to="/$tenantSlug/checkout"
              params={{ tenantSlug }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] py-4 font-semibold text-white shadow-[0_8px_32px_rgba(234,29,44,0.35)]"
            >
              Finalizar pedido
              <ChevronRight className="size-5" />
            </Link>
          </div>
        </div>
      )}
    </MenuLightShell>
  );
}
