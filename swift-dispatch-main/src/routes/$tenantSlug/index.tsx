import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getPublicMenuFn, type PublicMenuPayload, type MenuItemDto } from "@/functions/menu";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { MenuHero } from "@/components/menu/public/MenuHero";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";
import {
  ALL_CATEGORIES_ID,
  CategoryTabs,
  useCategorySpy,
} from "@/components/menu/public/CategoryTabs";
import { ProductCard } from "@/components/menu/public/ProductCard";
import {
  ProductDetailModal,
  type ProductConfirmPayload,
} from "@/components/menu/public/ProductDetailModal";
import { ProductImageLightbox } from "@/components/menu/public/ProductImageLightbox";
import { MenuProductRail } from "@/components/menu/public/MenuProductRail";
import { DrinkSuggestSheet } from "@/components/menu/public/DrinkSuggestSheet";
import { buildLineDisplayName } from "@/lib/menu/cart-line";
import {
  addToCart,
  getCart,
  getCartQtyMap,
  cartTotal,
  cartItemCount,
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
  const [detailItem, setDetailItem] = useState<MenuItemDto | null>(null);
  const [lightboxItem, setLightboxItem] = useState<{
    item: MenuItemDto;
    categoryName: string;
  } | null>(null);
  const [bumpId, setBumpId] = useState<string | null>(null);
  const [cartPulse, setCartPulse] = useState(false);
  const [drinkSuggest, setDrinkSuggest] = useState<{
    open: boolean;
    itemName: string;
  }>({ open: false, itemName: "" });

  const categories = useMemo(
    () =>
      (menu?.categories.filter((c) => c.items.length > 0) ?? []).map((c) => ({
        ...c,
        items: [...c.items].sort((a, b) => a.sort_order - b.sort_order),
      })),
    [menu],
  );

  const categoryNameByItemId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      for (const i of c.items) map.set(i.id, c.name);
    }
    return map;
  }, [categories]);

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
  const cartCount = cartItemCount(cart);
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

  const pushLine = (payload: ProductConfirmPayload, item: MenuItemDto) => {
    const line: CartItem = {
      line_id: payload.line_id,
      menu_item_id: item.id,
      name: item.name,
      unit_price: payload.unit_price,
      quantity: payload.quantity,
      notes: payload.notes || undefined,
      image_url: item.image_url,
      variation_id: payload.variation_id,
      variation_name: payload.variation_name,
      addons: payload.addons.length ? payload.addons : undefined,
    };
    addToCart(tenantSlug, line);
    syncCart();
    pulseCart(item.id);
    toast.success(`${buildLineDisplayName(line)} na sacola`, { duration: 1800 });
  };

  const quickAdd = (item: MenuItemDto) => {
    if (item.variations.length || item.addons.length) {
      setDetailItem(item);
      return;
    }
    const existing = getCart(tenantSlug).find((c) => c.menu_item_id === item.id);
    if (existing) {
      updateCartQty(tenantSlug, existing.line_id, 1);
    } else {
      addToCart(tenantSlug, {
        line_id: crypto.randomUUID(),
        menu_item_id: item.id,
        name: item.name,
        unit_price: item.price,
        quantity: 1,
        image_url: item.image_url,
      });
    }
    syncCart();
    pulseCart(item.id);
    toast.success(`${item.name} adicionado`, { duration: 1800 });
    maybeSuggestDrink(item);
  };

  const maybeSuggestDrink = (item: MenuItemDto) => {
    const cat = categoryNameByItemId.get(item.id)?.toLowerCase() ?? "";
    const isFood =
      !item.is_drink && !cat.includes("bebida") && !cat.includes("drink");
    const hasDrinks = (menu?.drinks.length ?? 0) > 0;
    if (isFood && hasDrinks) {
      setDrinkSuggest({ open: true, itemName: item.name });
    }
  };

  const remove = (item: MenuItemDto) => {
    const lines = getCart(tenantSlug).filter((c) => c.menu_item_id === item.id);
    if (lines.length === 1) {
      updateCartQty(tenantSlug, lines[0].line_id, -1);
    } else if (lines.length) {
      updateCartQty(tenantSlug, lines[lines.length - 1].line_id, -1);
    }
    syncCart();
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

  const openItem = (item: MenuItemDto) => setDetailItem(item);

  if (error) {
    return (
      <MenuLightShell tenantSlug={tenantSlug} title="Cardápio">
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <p className="text-sm text-[var(--menu-muted)]">{error}</p>
        </div>
      </MenuLightShell>
    );
  }

  if (!menu) {
    return (
      <MenuLightShell tenantSlug={tenantSlug} title="Carregando…">
        <div className={cn("mx-auto w-full animate-pulse space-y-4 px-4 py-4", MENU_PAGE_MAX)}>
          <div className="h-36 rounded-2xl bg-[var(--menu-card)]" />
          <div className="h-11 rounded-xl bg-[var(--menu-card)]" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-[var(--menu-card)]" />
            ))}
          </div>
        </div>
      </MenuLightShell>
    );
  }

  const minOrder = menu.settings.min_order_amount;

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

      <div className={cn("relative z-10 px-4 pt-3", MENU_PAGE_MAX, "mx-auto w-full")}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--menu-muted)]" />
          <input
            type="search"
            placeholder="Buscar no cardápio"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="menu-input pl-10 shadow-[var(--menu-shadow)]"
          />
        </div>
      </div>

      {minOrder > 0 && (
        <p className={cn("mx-auto w-full px-4 pt-2 text-center text-xs text-[var(--menu-muted)]", MENU_PAGE_MAX)}>
          Pedido mínimo {minOrder.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      )}

      {!search.trim() && (
        <div className="mt-4 space-y-0">
          <MenuProductRail
            title="Mais vendidos"
            icon="flame"
            items={menu.featured}
            categoryNameFor={(id) => categoryNameByItemId.get(id) ?? ""}
            onSelect={openItem}
          />
          {menu.combos.length > 0 && (
            <MenuProductRail
              title="Combos"
              icon="combo"
              items={menu.combos}
              categoryNameFor={(id) => categoryNameByItemId.get(id) ?? "combo"}
              onSelect={openItem}
            />
          )}
        </div>
      )}

      {categories.length > 0 && !search.trim() && (
        <CategoryTabs
          categories={categories}
          activeId={activeCat}
          onSelect={selectCategory}
        />
      )}

      <main
        id="menu-list-top"
        className={cn("mx-auto w-full scroll-mt-[7rem] px-4 pb-28 pt-4", MENU_PAGE_MAX)}
      >
        {displayCategories.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--menu-muted)]">
            {search
              ? "Nenhum item encontrado para sua busca."
              : "Cardápio em breve. O restaurante está configurando os produtos."}
          </p>
        ) : (
          displayCategories.map((cat) => (
            <section key={cat.id} id={`menu-cat-${cat.id}`} className="scroll-mt-[7rem] mb-6">
              <h2 className="menu-section-title mb-3 flex items-center gap-2">
                <span className="text-[var(--menu-accent)]">🔥</span>
                {cat.name}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {cat.items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    categoryName={cat.name}
                    quantity={qtyMap[item.id] ?? 0}
                    justAdded={bumpId === item.id}
                    layout="grid"
                    onOpenImage={() => setLightboxItem({ item, categoryName: cat.name })}
                    onOpenDetails={() => openItem(item)}
                    onAdd={() => quickAdd(item)}
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
        item={detailItem}
        open={!!detailItem}
        onClose={() => setDetailItem(null)}
        onConfirm={(payload) => {
          if (detailItem) {
            pushLine(payload, detailItem);
            maybeSuggestDrink(detailItem);
          }
        }}
      />

      <DrinkSuggestSheet
        drinks={menu.drinks}
        open={drinkSuggest.open}
        addedItemName={drinkSuggest.itemName}
        onClose={() => setDrinkSuggest({ open: false, itemName: "" })}
        onAdd={(d) => quickAdd(d)}
      />
    </MenuLightShell>
  );
}
