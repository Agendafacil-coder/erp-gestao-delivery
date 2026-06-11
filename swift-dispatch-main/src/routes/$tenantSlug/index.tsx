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
  const searchQuery = search.trim().toLowerCase();

  useEffect(() => {
    void getPublicMenuFn({ data: { tenantSlug } })
      .then((data) => setMenu(data))
      .catch((e) => setError((e as Error).message));
  }, [tenantSlug]);

  const isAllView = activeCat === ALL_CATEGORIES_ID;
  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
  useCategorySpy(categoryIds, setActiveCat, isAllView && !searchQuery);

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
    if (!searchQuery) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (i) =>
            i.name.toLowerCase().includes(searchQuery) ||
            (i.description?.toLowerCase().includes(searchQuery) ?? false),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu, categories, searchQuery]);

  const categoryTabs = useMemo(
    () =>
      categories.map((cat) => {
        const matched = searchQuery
          ? cat.items.filter(
              (i) =>
                i.name.toLowerCase().includes(searchQuery) ||
                (i.description?.toLowerCase().includes(searchQuery) ?? false),
            )
          : cat.items;
        return { id: cat.id, name: cat.name, itemCount: matched.length };
      }),
    [categories, searchQuery],
  );

  const displayCategories = useMemo(() => {
    if (activeCat === ALL_CATEGORIES_ID) return searchFiltered;
    return searchFiltered.filter((c) => c.id === activeCat);
  }, [searchFiltered, activeCat]);

  const showHighlights = !searchQuery && activeCat === ALL_CATEGORIES_ID;

  const selectCategory = (id: string) => {
    setActiveCat(id);
    requestAnimationFrame(() => {
      document.getElementById("menu-list-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
        <div className={cn("mx-auto w-full animate-pulse space-y-4", MENU_PAGE_MAX)}>
          <div className="h-44 bg-[var(--menu-card)] sm:h-52" />
          <div className="px-4 -mt-10">
            <div className="h-32 rounded-2xl bg-[var(--menu-surface)]" />
          </div>
          <div className="mx-4 h-12 rounded-2xl bg-[var(--menu-card)]" />
          <div className="space-y-3 px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-[var(--menu-card)]" />
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
      <MenuHero
        name={menu.tenant.name}
        coverImageUrl={
          menu.settings.menu_cover_url ??
          menu.featured[0]?.image_url ??
          menu.combos[0]?.image_url
        }
        logoUrl={menu.settings.menu_logo_url}
        city={menu.settings.store_city}
      />

      <div className={cn("relative z-10 px-4 pt-4", MENU_PAGE_MAX, "mx-auto w-full")}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--menu-muted)]" />
          <input
            type="search"
            placeholder="O que você está com vontade hoje?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="menu-input h-12 rounded-2xl pl-11 shadow-[var(--menu-shadow)]"
          />
        </div>
        {minOrder > 0 ? (
          <p className="mt-2 text-center text-[11px] font-medium text-[var(--menu-muted)]">
            Pedido mínimo{" "}
            <span className="text-[var(--menu-accent)]">
              {minOrder.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        ) : null}
      </div>

      {categories.length > 0 ? (
        <CategoryTabs
          categories={categoryTabs}
          activeId={activeCat}
          onSelect={selectCategory}
          dimEmpty={Boolean(searchQuery)}
        />
      ) : null}

      {showHighlights ? (
        <div className="mt-4 space-y-0">
          <MenuProductRail
            title="Mais vendidos"
            subtitle="Escolhas que conquistam"
            icon="flame"
            items={menu.featured}
            categoryNameFor={(id) => categoryNameByItemId.get(id) ?? ""}
            onSelect={openItem}
          />
          {menu.combos.length > 0 && (
            <MenuProductRail
              title="Combos"
              subtitle="Melhor custo-benefício"
              icon="combo"
              items={menu.combos}
              categoryNameFor={(id) => categoryNameByItemId.get(id) ?? "combo"}
              onSelect={openItem}
            />
          )}
        </div>
      ) : null}

      <main
        id="menu-list-top"
        className={cn("mx-auto w-full scroll-mt-[7rem] space-y-8 px-4 pb-28 pt-5", MENU_PAGE_MAX)}
      >
        {displayCategories.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--menu-muted)]">
            {searchQuery
              ? activeCat !== ALL_CATEGORIES_ID
                ? "Nenhum item nesta categoria para sua busca."
                : "Nenhum item encontrado para sua busca."
              : activeCat !== ALL_CATEGORIES_ID
                ? "Nenhum item nesta categoria."
                : "Cardápio em breve. O restaurante está configurando os produtos."}
          </p>
        ) : (
          displayCategories.map((cat) => (
            <section key={cat.id} id={`menu-cat-${cat.id}`} className="scroll-mt-[7rem]">
              <div className="mb-3.5 flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--menu-accent)]/12 text-sm font-bold text-[var(--menu-accent)]">
                  {cat.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h2 className="menu-section-title">{cat.name}</h2>
                  <p className="menu-section-subtitle">
                    {cat.items.length} {cat.items.length === 1 ? "item" : "itens"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                {cat.items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    categoryName={cat.name}
                    quantity={qtyMap[item.id] ?? 0}
                    justAdded={bumpId === item.id}
                    layout="list"
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
