import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPublicMenuFn, type PublicMenuPayload, type MenuItemDto } from "@/functions/menu";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { MenuLightShell } from "@/components/menu/MenuLightShell";
import { MenuHero } from "@/components/menu/public/MenuHero";
import { getMenuLayoutConfig, MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
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
import { MenuCategoryHeader } from "@/components/menu/public/MenuCategoryHeader";
import { MenuFeaturedStrip } from "@/components/menu/public/MenuFeaturedStrip";
import { MenuProductRail } from "@/components/menu/public/MenuProductRail";
import { DrinkSuggestSheet } from "@/components/menu/public/DrinkSuggestSheet";
import { buildLineDisplayName } from "@/lib/menu/cart-line";
import { formatOpeningHoursSummary, isStoreOpenNow } from "@/lib/menu/store-hours";
import {
  canShowOrderBump,
  cartHasDrink,
  clearOrderBumpSession,
  dismissOrderBump,
  listDrinkSuggestions,
  markOrderBumpShown,
  shouldSuggestDrinkAfterAdd,
} from "@/lib/menu/order-bump";
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
    drinks: MenuItemDto[];
  }>({ open: false, itemName: "", drinks: [] });

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
  /** Destaque da aba ao rolar no modo Início — não altera o filtro da lista */
  const [scrollSpyCat, setScrollSpyCat] = useState(ALL_CATEGORIES_ID);
  const searchQuery = search.trim().toLowerCase();

  useEffect(() => {
    void getPublicMenuFn({ data: { tenantSlug } })
      .then((data) => setMenu(data))
      .catch((e) => setError((e as Error).message));
  }, [tenantSlug]);

  const isAllView = activeCat === ALL_CATEGORIES_ID;
  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const spyPausedUntil = useRef(0);

  const onSpyCategory = useCallback((id: string) => {
    if (Date.now() < spyPausedUntil.current) return;
    if (window.scrollY < 150) return;
    setScrollSpyCat(id);
  }, []);

  useCategorySpy(categoryIds, onSpyCategory, isAllView && !searchQuery);
  const tabActiveId = isAllView ? scrollSpyCat : activeCat;

  useEffect(() => {
    if (!isAllView || searchQuery) return;
    const syncTopTab = () => {
      if (window.scrollY < 150) setScrollSpyCat(ALL_CATEGORIES_ID);
    };
    window.addEventListener("scroll", syncTopTab, { passive: true });
    syncTopTab();
    return () => window.removeEventListener("scroll", syncTopTab);
  }, [isAllView, searchQuery]);

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

  useEffect(() => {
    if (cart.length === 0) clearOrderBumpSession(tenantSlug);
  }, [cart.length, tenantSlug]);

  const suggestedDrinks = useMemo(() => {
    if (!menu) return [];
    return drinkSuggest.open && drinkSuggest.drinks.length > 0
      ? drinkSuggest.drinks
      : listDrinkSuggestions(menu, cart);
  }, [menu, cart, drinkSuggest.open, drinkSuggest.drinks]);

  const maybeSuggestDrink = (item: MenuItemDto) => {
    if (!menu || !canShowOrderBump(tenantSlug)) return;
    const categoryName = categoryNameByItemId.get(item.id) ?? "";
    if (!shouldSuggestDrinkAfterAdd(item, menu, categoryName)) return;
    const currentCart = getCart(tenantSlug);
    if (cartHasDrink(currentCart, menu, categoryNameByItemId)) return;
    const drinks = listDrinkSuggestions(menu, currentCart);
    if (drinks.length === 0) return;
    setDrinkSuggest({ open: true, itemName: item.name, drinks });
  };

  const closeDrinkSuggest = () =>
    setDrinkSuggest({ open: false, itemName: "", drinks: [] });

  const dismissDrinkSuggest = () => {
    closeDrinkSuggest();
    dismissOrderBump(tenantSlug);
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

  const layoutConfig = getMenuLayoutConfig(menu?.settings.menu_layout);
  const pageMax = layoutConfig.pageMax;
  const showHighlights =
    layoutConfig.highlightStyle !== "none" && !searchQuery && activeCat === ALL_CATEGORIES_ID;

  const selectCategory = (id: string) => {
    setActiveCat(id);
    setScrollSpyCat(id);
    spyPausedUntil.current = Date.now() + 900;
    if (id === ALL_CATEGORIES_ID) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(`menu-cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const storeOpen = isStoreOpenNow(menu.settings.opening_hours);
  const hoursSummary = formatOpeningHoursSummary(menu.settings.opening_hours);

  return (
    <MenuLightShell
      tenantSlug={tenantSlug}
      tenantName={menu.tenant.name}
      compactHeader
      cartCount={cartCount}
      cartTotal={total}
      cartPulse={cartPulse}
      menuLayout={menu.settings.menu_layout}
    >
      <MenuHero
        name={menu.tenant.name}
        variant={layoutConfig.heroVariant}
        layoutId={layoutConfig.id}
        pageMax={pageMax}
        isOpen={storeOpen}
        hoursSummary={hoursSummary}
        coverImageUrl={
          menu.settings.menu_cover_url ??
          menu.featured[0]?.image_url ??
          menu.combos[0]?.image_url
        }
        logoUrl={menu.settings.menu_logo_url}
        city={menu.settings.store_city}
      />

      {!storeOpen && menu.settings.opening_hours.enabled ? (
        <div
          className={cn(
            "relative z-10 mx-auto mt-3 rounded-xl border border-[var(--menu-border)] bg-[var(--menu-card)] px-4 py-3 text-center text-sm text-[var(--menu-muted)]",
            pageMax,
            "w-[calc(100%-2rem)]",
          )}
        >
          Loja fechada no momento.
          {hoursSummary ? (
            <>
              {" "}
              Horário: <span className="text-[var(--menu-fg)]">{hoursSummary}</span>
            </>
          ) : null}
        </div>
      ) : null}

      <div className={cn("relative z-10 px-4 pt-4", pageMax, "mx-auto w-full")}>
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
          activeId={tabActiveId}
          onSelect={selectCategory}
          dimEmpty={Boolean(searchQuery)}
          pageMax={pageMax}
        />
      ) : null}

      {showHighlights && layoutConfig.highlightStyle === "strip" ? (
        <MenuFeaturedStrip
          items={menu.featured.length > 0 ? menu.featured : menu.combos}
          onSelect={openItem}
          pageMax={pageMax}
        />
      ) : null}

      {showHighlights && layoutConfig.highlightStyle === "rail" ? (
        <div className="mt-4 space-y-0">
          <MenuProductRail
            title="Mais vendidos"
            subtitle="Escolhas que conquistam"
            icon="flame"
            items={menu.featured}
            categoryNameFor={(id) => categoryNameByItemId.get(id) ?? ""}
            onSelect={openItem}
            pageMax={pageMax}
            layoutId={layoutConfig.id}
          />
          {menu.combos.length > 0 && (
            <MenuProductRail
              title="Combos"
              subtitle="Melhor custo-benefício"
              icon="combo"
              items={menu.combos}
              categoryNameFor={(id) => categoryNameByItemId.get(id) ?? "combo"}
              onSelect={openItem}
              pageMax={pageMax}
              layoutId={layoutConfig.id}
            />
          )}
        </div>
      ) : null}

      <main
        id="menu-list-top"
        className={cn(
          "mx-auto w-full scroll-mt-[7rem] px-4 pb-28 pt-5",
          pageMax,
          layoutConfig.mainSpacingClass,
        )}
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
            <section
              key={cat.id}
              id={`menu-cat-${cat.id}`}
              className={cn("scroll-mt-[7rem]", layoutConfig.categorySectionClass)}
            >
              <MenuCategoryHeader
                name={cat.name}
                itemCount={cat.items.length}
                layoutId={layoutConfig.id}
              />
              <div className={layoutConfig.categoryGridClass}>
                {cat.items.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    categoryName={cat.name}
                    quantity={qtyMap[item.id] ?? 0}
                    justAdded={bumpId === item.id}
                    layout={layoutConfig.productLayout}
                    variant={layoutConfig.cardVariant}
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
        drinks={suggestedDrinks}
        open={drinkSuggest.open && suggestedDrinks.length > 0}
        addedItemName={drinkSuggest.itemName}
        onClose={closeDrinkSuggest}
        onDismiss={dismissDrinkSuggest}
        onOpened={() => markOrderBumpShown(tenantSlug)}
        onAdd={(d) => quickAdd(d)}
      />
    </MenuLightShell>
  );
}
