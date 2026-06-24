import { useEffect, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { getLastOrderByPhoneFn, listCustomerFavoritesFn } from "@/functions/publicCustomer";
import { addToCart, type CartItem } from "@/lib/public-cart";
import { newLineId } from "@/lib/menu/cart-line";
import { formatBRL } from "@/lib/menu/format";
import { toast } from "sonner";

const PHONE_KEY_PREFIX = "delivery-os-customer-phone:";

export function getStoredCustomerPhone(tenantSlug: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${PHONE_KEY_PREFIX}${tenantSlug}`) ?? "";
}

export function storeCustomerPhone(tenantSlug: string, phone: string) {
  if (typeof window === "undefined") return;
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    localStorage.setItem(`${PHONE_KEY_PREFIX}${tenantSlug}`, digits);
  }
}

type Props = {
  tenantSlug: string;
  onCartChange: () => void;
};

export function ReorderLastOrderSection({ tenantSlug, onCartChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const phone = getStoredCustomerPhone(tenantSlug);

  useEffect(() => {
    if (!phone) {
      setLastCode(null);
      return;
    }
    void getLastOrderByPhoneFn({ data: { tenantSlug, phone } })
      .then((order) => {
        if (order) {
          setLastCode(order.code);
          setItemCount(order.items.length);
        } else {
          setLastCode(null);
        }
      })
      .catch(() => setLastCode(null));
  }, [tenantSlug, phone]);

  if (!phone || !lastCode) return null;

  const reorder = async () => {
    setLoading(true);
    try {
      const order = await getLastOrderByPhoneFn({ data: { tenantSlug, phone } });
      if (!order?.items.length) {
        toast.info("Nenhum pedido anterior encontrado");
        return;
      }
      for (const item of order.items) {
        if (!item.menu_item_id) continue;
        addToCart(tenantSlug, {
          line_id: newLineId(),
          menu_item_id: item.menu_item_id,
          name: item.name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          image_url: item.image_url ?? undefined,
        } satisfies CartItem);
      }
      onCartChange();
      toast.success(`Itens do pedido ${order.code} adicionados ao carrinho`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao repetir pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="menu-card mb-4 flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <RotateCcw className="size-4 text-[var(--menu-accent)]" />
          Pedir de novo
        </p>
        <p className="text-xs text-[var(--menu-muted)] mt-0.5">
          Repetir pedido {lastCode} · {itemCount} item(ns)
        </p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void reorder()}
        className="shrink-0 rounded-full bg-[var(--menu-accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Adicionar"}
      </button>
    </section>
  );
}

export function CustomerFavoritesSection({
  tenantSlug,
  onCartChange,
}: {
  tenantSlug: string;
  onCartChange: () => void;
}) {
  const [favorites, setFavorites] = useState<
    Array<{ menu_item_id: string; name: string; price: number; image_url: string | null }>
  >([]);
  const phone = getStoredCustomerPhone(tenantSlug);

  useEffect(() => {
    if (!phone) {
      setFavorites([]);
      return;
    }
    void listFavorites(phone);
  }, [tenantSlug, phone]);

  async function listFavorites(p: string) {
    const rows = await listCustomerFavoritesFn({ data: { tenantSlug, phone: p } });
    setFavorites(rows);
  }

  if (!phone || favorites.length === 0) return null;

  return (
    <section className="menu-card mb-4 space-y-2 p-4">
      <p className="text-sm font-semibold">Seus favoritos</p>
      <div className="space-y-2">
        {favorites.map((item) => (
          <div
            key={item.menu_item_id}
            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--menu-border)] p-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs font-bold text-[var(--menu-accent)]">{formatBRL(item.price)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
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
              }}
              className="text-xs font-semibold text-[var(--menu-accent)]"
            >
              +
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
