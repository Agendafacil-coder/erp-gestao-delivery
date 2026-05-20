import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getPublicMenuFn, type PublicMenuPayload, type MenuItemDto } from "@/functions/menu";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { MenuHero } from "@/components/menu/public/MenuHero";
import {
  ALL_CATEGORIES_ID,
  CategoryTabs,
  useCategorySpy,
} from "@/components/menu/public/CategoryTabs";
import { ProductCard } from "@/components/menu/public/ProductCard";
import { ProductDetailModal } from "@/components/menu/public/ProductDetailModal";
import { ProductImageLightbox } from "@/components/menu/public/ProductImageLightbox";
import {
  addToCart,
  getCart,
  getCartQtyMap,
  cartTotal,
  setCartLine,
  updateCartQty,
  type CartItem,
} from "@/lib/public-cart";

export const Route = createFileRoute("/$tenantSlug/")({
  component: PublicMenuPage,
});

function PublicMenuPage() {
  const { tenantSlug } = Route.useParams();
  const [menu, setMenu] = useState<PublicMenuPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>(() => getCart(tenantSlug));
  const [detailItem, setDetailItem] = useState<{
    item: MenuItemDto;
    categoryName: string;
  } | null>(null);
  const [lightboxItem, setLightboxItem] = useState<{
    item: MenuItemDto;
    categoryName: string;
  } | null>(null);
  const [bumpId, setBumpId] = useState<string | null>(null);
  const [cartPulse, setCartPulse] = useState(false);

  const categories = useMemo(
    () =>
      (menu?.categories.filter((c) => c.items.length > 0) ?? []).map((c) => ({
        ...c,
        items: [...c.items].sort((a, b) => a.sort_order - b.sort_order),
      })),
    [menu],
  );

  const [activeCat, setActiveCat] = useState(ALL_CATEGORIES_ID);

  useEffect(() => {
    void getPublicMenuFn({ data: { tenantSlug } })
      .then((data) => setMenu(data))
      .catch((e) => setError((e as Error).message));
  }, [tenantSlug]);

  const isAllView = activeCat === ALL_CATEGORIES_ID;
  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
  useCategorySpy(categoryIds, setActiveCat, isAllView && !search.trim());

  const qtyMap = useMemo(() => getCartQtyMap(cart), [cart]);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const total = cartTotal(cart);

  const syncCart = () => setCart(getCart(tenantSlug));

  const pulseCart = (itemId?: string) => {
    setCartPulse(true);
    if (itemId) setBumpId(itemId);
    window.setTimeout(() => {
      setCartPulse(false);
      setBumpId(null);
    }, 400);
  };

  const add = (item: MenuItemDto, notes?: string) => {
    const existing = getCart(tenantSlug).find((c) => c.menu_item_id === item.id);
    if (existing) {
      updateCartQty(tenantSlug, item.id, 1);
    } else {
      addToCart(tenantSlug, {
        menu_item_id: item.id,
        name: item.name,
        unit_price: item.price,
        quantity: 1,
        notes,
        image_url: item.image_url,
      });
    }
    syncCart();
    pulseCart(item.id);
    toast.success(`${item.name} adicionado`, { duration: 1800 });
  };

  const remove = (item: MenuItemDto) => {
    updateCartQty(tenantSlug, item.id, -1);
    syncCart();
  };

  const confirmFromModal = (item: MenuItemDto, quantity: number, notes: string) => {
    setCartLine(tenantSlug, {
      menu_item_id: item.id,
      name: item.name,
      unit_price: item.price,
      quantity,
      notes: notes || undefined,
      image_url: item.image_url,
    });
    syncCart();
    pulseCart(item.id);
    toast.success(
      quantity > 1 ? `${quantity}× ${item.name} na sacola` : `${item.name} na sacola`,
      { duration: 1800 },
    );
  };

  const searchFiltered = useMemo(() => {
    if (!menu) return [];
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            (i.description?.toLowerCase().includes(q) ?? false),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu, categories, search]);

  const displayCategories = useMemo(() => {
    if (search.trim() || activeCat === ALL_CATEGORIES_ID) return searchFiltered;
    return searchFiltered.filter((c) => c.id === activeCat);
  }, [searchFiltered, activeCat, search]);

  const selectCategory = (id: string) => {
    setActiveCat(id);
    if (id === ALL_CATEGORIES_ID) {
      document.getElementById("menu-list-top")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <MenuLightShell tenantSlug={tenantSlug} title="Cardápio">
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <p className="text-sm text-[#888]">{error}</p>
        </div>
      </MenuLightShell>
    );
  }

  if (!menu) {
    return (
      <MenuLightShell tenantSlug={tenantSlug} title="Carregando…">
        <div className="mx-auto max-w-lg animate-pulse space-y-4 p-4">
          <div className="h-20 rounded-2xl bg-white" />
          <div className="h-11 rounded-xl bg-white" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[118px] rounded-2xl bg-white" />
          ))}
        </div>
      </MenuLightShell>
    );
  }

  return (
    <MenuLightShell
      tenantSlug={tenantSlug}
      tenantName={menu.tenant.name}
      compactHeader
      cartCount={cartCount}
      cartTotal={total}
      cartPulse={cartPulse}
    >
      <MenuHero name={menu.tenant.name} />

      <div className="relative z-10 mx-auto max-w-lg px-4 pt-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#aaa]" />
          <input
            type="search"
            placeholder="Buscar no cardápio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-xl border border-black/[0.06] bg-white pl-10 pr-4 text-sm shadow-sm placeholder:text-[#aaa] focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/25"
          />
        </div>
      </div>

      {categories.length > 0 && !search.trim() && (
        <CategoryTabs
          categories={categories}
          activeId={activeCat}
          onSelect={selectCategory}
        />
      )}

      <main
        id="menu-list-top"
        className="mx-auto max-w-lg space-y-9 px-4 py-5 pb-32 scroll-mt-28"
      >
        {displayCategories.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#888]">
            {search
              ? "Nenhum item encontrado para sua busca."
              : "Cardápio em breve. O restaurante está configurando os produtos."}
          </p>
        ) : (
          displayCategories.map((cat) => (
            <section key={cat.id} id={`menu-cat-${cat.id}`} className="scroll-mt-28">
              <h2 className="mb-3.5 px-0.5 text-base font-bold tracking-tight text-[#1c1c1e]">
                {cat.name}
              </h2>
              <div className="space-y-3.5">
                {cat.items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    categoryName={cat.name}
                    quantity={qtyMap[item.id] ?? 0}
                    justAdded={bumpId === item.id}
                    onOpenImage={() => setLightboxItem({ item, categoryName: cat.name })}
                    onOpenDetails={() => setDetailItem({ item, categoryName: cat.name })}
                    onAdd={() => add(item)}
                    onRemove={() => remove(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <ProductImageLightbox
        imageUrl={lightboxItem?.item.image_url ?? null}
        productName={lightboxItem?.item.name ?? ""}
        categoryName={lightboxItem?.categoryName ?? ""}
        open={!!lightboxItem}
        onClose={() => setLightboxItem(null)}
      />

      <ProductDetailModal
        item={detailItem?.item ?? null}
        open={!!detailItem}
        cartQuantity={detailItem ? (qtyMap[detailItem.item.id] ?? 0) : 0}
        onClose={() => setDetailItem(null)}
        onConfirm={(qty, notes) => {
          if (detailItem) confirmFromModal(detailItem.item, qty, notes);
        }}
      />
    </MenuLightShell>
  );
}
