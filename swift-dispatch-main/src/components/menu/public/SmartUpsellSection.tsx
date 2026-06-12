import { useEffect, useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import { getSmartUpsellFn } from "@/functions/smartUpsell";
import type { SmartUpsellSuggestion } from "@/lib/menu/smartUpsell";
import { formatBRL } from "@/lib/menu/format";
import { addToCart, type CartItem } from "@/lib/public-cart";
import { newLineId } from "@/lib/menu/cart-line";
import { toast } from "sonner";

type SmartUpsellSectionProps = {
  tenantSlug: string;
  cartItems: CartItem[];
  onCartChange: () => void;
};

export function SmartUpsellSection({
  tenantSlug,
  cartItems,
  onCartChange,
}: SmartUpsellSectionProps) {
  const [suggestions, setSuggestions] = useState<SmartUpsellSuggestion[]>([]);

  useEffect(() => {
    if (!cartItems.length) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void getSmartUpsellFn({
        data: {
          tenantSlug,
          cartItemIds: [...new Set(cartItems.map((i) => i.menu_item_id))],
          limit: 3,
        },
      })
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [tenantSlug, cartItems]);

  if (!suggestions.length) return null;

  const addSuggestion = (item: SmartUpsellSuggestion) => {
    addToCart(tenantSlug, {
      line_id: newLineId(),
      menu_item_id: item.menu_item_id,
      name: item.name,
      unit_price: item.price,
      quantity: 1,
      image_url: item.image_url ?? undefined,
    });
    onCartChange();
    toast.success(`${item.name} adicionado`);
  };

  return (
    <section className="menu-card mb-4 space-y-3 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-[var(--menu-accent)]" />
        Sugestões para você
      </h2>
      <div className="space-y-2">
        {suggestions.map((item) => (
          <div
            key={item.menu_item_id}
            className="flex items-center gap-3 rounded-xl border border-[var(--menu-border)] bg-[var(--menu-surface)] p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{item.name}</div>
              <div className="text-xs text-[var(--menu-muted)]">{item.reason}</div>
              <div className="mt-0.5 text-sm font-bold text-[var(--menu-accent)]">
                {formatBRL(item.price)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => addSuggestion(item)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--menu-accent)] text-white"
              aria-label={`Adicionar ${item.name}`}
            >
              <Plus className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
