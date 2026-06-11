import { useEffect, useState } from "react";
import {
  backfillMenuImagesFn,
  deleteMenuCategoryFn,
  deleteMenuItemFn,
  duplicateMenuCategoryFn,
  listMenuAdminFn,
  upsertMenuCategoryFn,
  type MenuItemDto,
  type PublicMenuPayload,
} from "@/functions/menu";
import {
  addMenuItemToPayload,
  removeMenuItemFromPayload,
  setMenuItemInPayload,
} from "@/lib/menu/admin-state";
import { MenuBrandingDialog } from "@/components/menu/admin/MenuBrandingDialog";
import { MenuImportDialog } from "@/components/menu/admin/MenuImportDialog";
import { MenuSortableCategoriesList } from "@/components/menu/admin/MenuSortableCategoriesList";
import { MenuSortableCategoryList } from "@/components/menu/admin/MenuSortableCategoryList";
import { Switch } from "@/components/ui/switch";
import { categoryEmoji } from "@/lib/menu/format";
import { toast } from "sonner";
import { MenuImageUpload } from "@/components/menu/admin/MenuImageUpload";
import {
  MenuProductOptionsEditor,
  parseAddonForms,
  parseVariationForms,
  type AddonFormRow,
  type VariationFormRow,
} from "@/components/menu/admin/MenuProductOptionsEditor";
import { ErrorState, LoadingState } from "@/components/ops/StateViews";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Copy,
  ExternalLink,
  PauseCircle,
  UtensilsCrossed,
  FolderPlus,
  Package,
  AlertTriangle,
  Search,
  Upload,
  ImageIcon,
  Download,
  MoreHorizontal,
  Palette,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { downloadMenuCsv } from "@/lib/menu/menu-export";
import { isMenuItemLowStock } from "@/lib/menu/menu-stock";

type MenuTab = "ativos" | "categorias" | "pausados";
type ProductFilter = "all" | "low_stock";

function matchesProductFilters(
  item: MenuItemDto,
  searchQuery: string,
  productFilter: ProductFilter,
): boolean {
  if (productFilter === "low_stock" && !isMenuItemLowStock(item.stock_quantity, item.stock_min)) {
    return false;
  }
  if (!searchQuery) return true;
  return (
    item.name.toLowerCase().includes(searchQuery) ||
    (item.description?.toLowerCase().includes(searchQuery) ?? false)
  );
}

function categoriesForTab(
  menu: PublicMenuPayload,
  tab: "ativos" | "pausados",
): PublicMenuPayload["categories"] {
  return menu.categories
    .map((cat) => ({
      ...cat,
      items: cat.items
        .filter((i) => (tab === "ativos" ? i.available : !i.available))
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((cat) => cat.items.length > 0);
}

type MenuManagerProps = {
  tenantId: string;
  tenantSlug: string;
};

type ItemForm = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  price: string;
  unitCost: string;
  stockQuantity: string;
  stockMin: string;
  imageUrl: string;
  available: boolean;
  isFeatured: boolean;
  isCombo: boolean;
  isDrink: boolean;
  variations: VariationFormRow[];
  addons: AddonFormRow[];
};

const emptyItemForm = (categoryId: string): ItemForm => ({
  categoryId,
  name: "",
  description: "",
  price: "",
  unitCost: "",
  stockQuantity: "",
  stockMin: "0",
  imageUrl: "",
  available: true,
  isFeatured: false,
  isCombo: false,
  isDrink: false,
  variations: [],
  addons: [],
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Tempo esgotado ao carregar o cardápio")), ms);
    }),
  ]);
}

export function MenuManager({ tenantId, tenantSlug }: MenuManagerProps) {
  const [menu, setMenu] = useState<PublicMenuPayload | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [tab, setTab] = useState<MenuTab>("ativos");
  const [catName, setCatName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm(""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [categoryFilterId, setCategoryFilterId] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);

  const menuUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${tenantSlug}` : "";

  const load = async () => {
    setMenuError(null);
    try {
      const data = await withTimeout(listMenuAdminFn({ data: { tenantId } }), 20_000);
      setMenu(data);
      if (data.categories[0] && !itemForm.categoryId) {
        setItemForm(emptyItemForm(data.categories[0].id));
      }
    } catch (e) {
      const message = (e as Error).message || "Falha ao carregar cardápio";
      setMenuError(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    setMenu(null);
    void load();
  }, [tenantId]);

  const closeProductForm = () => {
    setProductFormOpen(false);
    const catId = menu?.categories[0]?.id ?? "";
    setEditingId(null);
    setItemForm(emptyItemForm(catId));
  };

  const openNewProduct = () => {
    if (!menu?.categories.length) {
      toast.error("Crie uma categoria antes de adicionar produtos");
      setTab("categorias");
      return;
    }
    setTab("ativos");
    setEditingId(null);
    setItemForm(emptyItemForm(menu.categories[0].id));
    setProductFormOpen(true);
  };

  const startEdit = (item: MenuItemDto, categoryId: string) => {
    setEditingId(item.id);
    setItemForm({
      id: item.id,
      categoryId,
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      unitCost: item.unit_cost != null ? String(item.unit_cost) : "",
      stockQuantity:
        item.stock_quantity != null ? String(item.stock_quantity) : "",
      stockMin: String(item.stock_min ?? 0),
      imageUrl: item.image_url ?? "",
      available: item.available,
      isFeatured: item.is_featured,
      isCombo: item.is_combo,
      isDrink: item.is_drink,
      variations: item.variations.map((v) => ({
        name: v.name,
        price: String(v.price).replace(".", ","),
      })),
      addons: item.addons.map((a) => ({
        name: a.name,
        price: String(a.price).replace(".", ","),
        groupName: a.group_name,
        required: a.required,
        maxQuantity: String(a.max_quantity),
        isSuggested: a.is_suggested,
      })),
    });
    setProductFormOpen(true);
  };

  const syncPreviewUrl = (url: string) => {
    setItemForm((f) => ({ ...f, imageUrl: url }));
  };

  const saveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.categoryId || !menu) {
      toast.error("Preencha nome e categoria");
      return;
    }
    const price = parseFloat(itemForm.price.replace(",", "."));
    if (Number.isNaN(price) || price < 0) {
      toast.error("Preço inválido");
      return;
    }
    const unitCostRaw = itemForm.unitCost.trim();
    const unitCost = unitCostRaw
      ? parseFloat(unitCostRaw.replace(",", "."))
      : null;
    if (unitCost != null && (Number.isNaN(unitCost) || unitCost < 0)) {
      toast.error("Custo unitário inválido");
      return;
    }
    const stockRaw = itemForm.stockQuantity.trim();
    const stockQuantity = stockRaw
      ? parseInt(stockRaw.replace(/\D/g, ""), 10)
      : null;
    if (stockQuantity != null && (Number.isNaN(stockQuantity) || stockQuantity < 0)) {
      toast.error("Estoque inválido");
      return;
    }
    const stockMinRaw = itemForm.stockMin.trim();
    const stockMin = stockMinRaw ? parseInt(stockMinRaw.replace(/\D/g, ""), 10) : 0;
    if (Number.isNaN(stockMin) || stockMin < 0) {
      toast.error("Estoque mínimo inválido");
      return;
    }
    const parsedVariations = parseVariationForms(itemForm.variations);
    if ("error" in parsedVariations) {
      toast.error(parsedVariations.error);
      return;
    }
    const parsedAddons = parseAddonForms(itemForm.addons);
    if ("error" in parsedAddons) {
      toast.error(parsedAddons.error);
      return;
    }
    const res = await fetch("/api/menu/admin/item", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId,
        id: itemForm.id,
        categoryId: itemForm.categoryId,
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        price,
        unitCost,
        stockQuantity,
        stockMin: stockQuantity != null ? stockMin : 0,
        imageUrl: itemForm.imageUrl.trim() || null,
        available: itemForm.available,
        isFeatured: itemForm.isFeatured,
        isCombo: itemForm.isCombo,
        isDrink: itemForm.isDrink,
        variations: parsedVariations.variations,
        addons: parsedAddons.addons,
      }),
    });
    const dto = (await res.json()) as MenuItemDto & { error?: string };
    if (!res.ok) throw new Error(dto.error ?? "Falha ao salvar produto");
    setMenu((prev) => {
      if (!prev) return prev;
      if (itemForm.id) {
        return setMenuItemInPayload(prev, dto.id, dto, dto.category_id);
      }
      return addMenuItemToPayload(prev, dto, dto.category_id);
    });
    toast.success(
      editingId
        ? itemForm.available
          ? "Produto atualizado"
          : "Produto atualizado e pausado"
        : "Produto adicionado",
    );
    closeProductForm();
    if (tab === "pausados" && itemForm.available) {
      setTab("ativos");
    }
  };

  const addCategory = async () => {
    if (!catName.trim()) return;
    await upsertMenuCategoryFn({ data: { tenantId, name: catName.trim() } });
    setCatName("");
    await load();
    toast.success("Categoria criada");
  };

  const saveCategoryName = async (categoryId: string) => {
    const name = editingCategoryName.trim();
    if (!name) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    await upsertMenuCategoryFn({ data: { tenantId, id: categoryId, name } });
    setEditingCategoryId(null);
    setEditingCategoryName("");
    await load();
    toast.success("Categoria atualizada");
  };

  const removeCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Excluir a categoria "${categoryName}"? Só é possível se estiver vazia.`)) return;
    try {
      await deleteMenuCategoryFn({ data: { tenantId, categoryId } });
      await load();
      toast.success("Categoria removida");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const duplicateCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Duplicar a categoria "${categoryName}" com todos os produtos?`)) return;
    try {
      const result = await duplicateMenuCategoryFn({ data: { tenantId, categoryId } });
      await load();
      if (result.itemsCopied === 0) {
        toast.success("Categoria duplicada (sem produtos)");
      } else {
        toast.success(
          `Categoria duplicada com ${result.itemsCopied} produto${result.itemsCopied === 1 ? "" : "s"} (pausados)`,
        );
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const exportCsv = () => {
    if (!menu || totalItems === 0) {
      toast.message("Nenhum produto para exportar");
      return;
    }
    downloadMenuCsv(menu);
    toast.success("CSV do cardápio baixado");
  };

  const fillTestImages = async () => {
    try {
      const result = await backfillMenuImagesFn({ data: { tenantId } });
      if (result.updated === 0) {
        toast.info("Todos os produtos já têm foto");
        return;
      }
      await load();
      toast.success(`${result.updated} foto(s) de teste adicionada(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!confirm("Remover este produto do cardápio?")) return;
    if (!menu) return;
    const snapshot = menu;
    setMenu(removeMenuItemFromPayload(menu, itemId));
    try {
      await deleteMenuItemFn({ data: { itemId, tenantId } });
      toast.success("Produto removido");
    } catch (e) {
      setMenu(snapshot);
      toast.error((e as Error).message);
    }
  };

  if (menuError) {
    return (
      <ErrorState
        className="max-w-3xl min-h-[40vh]"
        title="Não foi possível carregar o cardápio"
        description={menuError}
        onRetry={() => void load()}
      />
    );
  }

  if (!menu) {
    return <LoadingState label="Carregando cardápio…" className="max-w-3xl min-h-[40vh]" />;
  }

  const allItems = menu.categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const activeItems = allItems.filter((i) => i.available).length;
  const pausedItems = totalItems - activeItems;
  const lowStockItems = allItems.filter((i) =>
    isMenuItemLowStock(i.stock_quantity, i.stock_min),
  );
  const featuredCount = allItems.filter((i) => i.is_featured).length;

  const searchQuery = productSearch.trim().toLowerCase();
  const hasProductFilters =
    Boolean(searchQuery) || productFilter !== "all" || categoryFilterId !== "all";

  const countFilteredInTab = (listTab: "ativos" | "pausados") => {
    let cats = categoriesForTab(menu, listTab);
    if (categoryFilterId !== "all") {
      cats = cats.filter((c) => c.id === categoryFilterId);
    }
    return cats
      .flatMap((c) => c.items)
      .filter((i) => matchesProductFilters(i, searchQuery, productFilter)).length;
  };

  const clearProductFilters = () => {
    setProductSearch("");
    setProductFilter("all");
    setCategoryFilterId("all");
  };

  const focusLowStock = () => {
    setTab("ativos");
    setProductFilter((f) => (f === "low_stock" ? "all" : "low_stock"));
  };

  const categoriesInTab =
    tab === "ativos" || tab === "pausados" ? categoriesForTab(menu, tab) : [];

  const renderProductList = (listTab: "ativos" | "pausados") => {
    let cats = categoriesForTab(menu, listTab);
    if (categoryFilterId !== "all") {
      cats = cats.filter((c) => c.id === categoryFilterId);
    }
    if (hasProductFilters) {
      cats = cats
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((i) => matchesProductFilters(i, searchQuery, productFilter)),
        }))
        .filter((cat) => cat.items.length > 0);
    }
    if (cats.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground/80">
          {categoryFilterId !== "all" && !searchQuery && productFilter === "all"
            ? "Nenhum produto nesta categoria nesta aba."
            : productFilter === "low_stock"
              ? "Nenhum produto com estoque baixo nesta aba."
              : searchQuery
                ? "Nenhum produto encontrado para esta busca."
                : listTab === "pausados"
                  ? "Nenhum produto pausado. Itens pausados não aparecem no cardápio do cliente."
                  : "Nenhum produto ativo. Use Novo produto ou reative itens na aba Pausados."}
        </p>
      );
    }
    return cats.map((cat) => (
      <section key={cat.id} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
            <span className="text-base leading-none opacity-80">{categoryEmoji(cat.name)}</span>
            {cat.name}
          </h3>
          <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
            Arraste para ordenar
          </span>
        </div>
        <MenuSortableCategoryList
          categoryId={cat.id}
          categoryName={cat.name}
          items={cat.items}
          listTab={listTab}
          tenantId={tenantId}
          categories={menu.categories}
          menu={menu}
          onMenuChange={setMenu}
          onEdit={startEdit}
          onDelete={removeItem}
          onAvailabilityChange={(available) => {
            if (available && listTab === "pausados") setTab("ativos");
            if (!available && listTab === "ativos") setTab("pausados");
          }}
        />
      </section>
    ));
  };

  return (
    <div className="menu-admin relative mx-auto max-w-3xl space-y-8 pb-28 md:pb-0">
      <div className="erp-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <UtensilsCrossed className="size-3.5 text-primary/80 shrink-0" />
              <span>Cardápio digital</span>
            </div>
            <h1 className="erp-page-title">Gerenciar cardápio</h1>
            <p className="erp-page-subtitle">
              {activeItems} ativos · {totalItems} produtos · {menu.categories.length} categorias
              {featuredCount > 0 ? ` · ${featuredCount} destaques` : ""}
              {pausedItems > 0 ? ` · ${pausedItems} pausados` : ""}
              {lowStockItems.length > 0 ? ` · ${lowStockItems.length} estoque baixo` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="erp-btn-secondary text-xs py-2">
                  <MoreHorizontal className="size-4" />
                  Mais ações
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-border bg-popover w-48">
                <DropdownMenuItem
                  className="text-sm focus:bg-muted"
                  onClick={() => setBrandingOpen(true)}
                >
                  <Palette className="size-4 opacity-70" />
                  Personalizar aparência
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-sm focus:bg-muted"
                  onClick={() => void fillTestImages()}
                >
                  <ImageIcon className="size-4 opacity-70" />
                  Fotos de teste
                </DropdownMenuItem>
                <DropdownMenuItem className="text-sm focus:bg-muted" onClick={exportCsv}>
                  <Download className="size-4 opacity-70" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-sm focus:bg-muted"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload className="size-4 opacity-70" />
                  Importar CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <a
              href={menuUrl}
              target="_blank"
              rel="noreferrer"
              className="erp-btn-secondary shrink-0"
            >
              <ExternalLink className="size-4 opacity-70" />
              Ver como cliente
            </a>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <input
            readOnly
            value={menuUrl}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(menuUrl);
              toast.success("Link copiado!");
            }}
            className="rounded-lg border border-border px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Copiar link"
          >
            <Copy className="size-4" />
          </button>
        </div>

      </div>

      {lowStockItems.length > 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
          <p className="text-foreground/90 flex-1">
            {lowStockItems.length} produto(s) com estoque no mínimo ou abaixo:{" "}
            {lowStockItems
              .slice(0, 3)
              .map((i) => i.name)
              .join(", ")}
            {lowStockItems.length > 3 ? "…" : ""}
          </p>
          <button
            type="button"
            onClick={focusLowStock}
            className="shrink-0 text-xs font-medium text-warning hover:underline"
          >
            {productFilter === "low_stock" ? "Limpar filtro" : "Ver lista"}
          </button>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex w-full max-w-2xl flex-wrap gap-0.5 rounded-xl border border-border bg-muted p-1">
        <button
          type="button"
          onClick={() => setTab("ativos")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "ativos"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="size-4 opacity-70" />
          Produtos ativos
          {activeItems > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                tab === "ativos" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {activeItems}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("categorias")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "categorias"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderPlus className="size-4 opacity-70" />
          Categorias
        </button>
        <button
          type="button"
          onClick={() => setTab("pausados")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === "pausados"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PauseCircle className="size-4 opacity-70" />
          Pausados
          {pausedItems > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                tab === "pausados" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {pausedItems}
            </span>
          )}
        </button>
      </div>

      {tab === "categorias" ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Nova categoria</h2>
          <p className="text-xs text-muted-foreground">
            Organize o cardápio em seções: Lanches, Bebidas, Combos…
          </p>
          <div className="flex gap-2">
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Nome da categoria"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/40"
              onKeyDown={(e) => e.key === "Enter" && void addCategory()}
            />
            <button
              type="button"
              onClick={() => void addCategory()}
              className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/15 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
            >
              <Plus className="size-4" />
              Criar
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60">Arraste para definir a ordem no cardápio público</p>
          <MenuSortableCategoriesList
            categories={menu.categories}
            tenantId={tenantId}
            menu={menu}
            onMenuChange={setMenu}
            editingCategoryId={editingCategoryId}
            editingCategoryName={editingCategoryName}
            onStartEdit={(cat) => {
              setEditingCategoryId(cat.id);
              setEditingCategoryName(cat.name);
            }}
            onEditingNameChange={setEditingCategoryName}
            onSaveEdit={(id) => void saveCategoryName(id)}
            onCancelEdit={() => setEditingCategoryId(null)}
            onDelete={(id, name) => void removeCategory(id, name)}
            onDuplicate={(id, name) => void duplicateCategory(id, name)}
          />
        </section>
      ) : tab === "ativos" || tab === "pausados" ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Buscar produto por nome ou descrição…"
              className="pl-9 h-10 text-sm"
            />
          </div>
          {categoriesInTab.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setCategoryFilterId("all")}
                className={cn(
                  "shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition font-medium",
                  categoryFilterId === "all"
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50",
                )}
              >
                Todas
              </button>
              {categoriesInTab.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setCategoryFilterId((id) => (id === cat.id ? "all" : cat.id))
                  }
                  className={cn(
                    "shrink-0 text-[11px] px-2.5 py-1 rounded-full border transition font-medium max-w-[10rem] truncate",
                    categoryFilterId === cat.id
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                  title={cat.name}
                >
                  {categoryEmoji(cat.name)} {cat.name}
                  <span className="ml-1 tabular-nums opacity-70">({cat.items.length})</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setProductFilter((f) => (f === "low_stock" ? "all" : "low_stock"))}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full border transition font-medium",
                productFilter === "low_stock"
                  ? "bg-warning/15 border-warning/30 text-warning"
                  : "border-border text-muted-foreground hover:bg-muted/50",
              )}
            >
              Estoque baixo
              {lowStockItems.length > 0 ? (
                <span className="ml-1 tabular-nums opacity-80">({lowStockItems.length})</span>
              ) : null}
            </button>
            {hasProductFilters ? (
              <button
                type="button"
                onClick={clearProductFilters}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
          {hasProductFilters ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {countFilteredInTab(tab)} resultado{countFilteredInTab(tab) === 1 ? "" : "s"}
            </p>
          ) : null}

          <div className="hidden items-center justify-between gap-4 md:flex">
            <p className="text-sm text-muted-foreground/80">
              {tab === "ativos"
                ? `${activeItems} ${activeItems === 1 ? "item" : "itens"} visíveis no cardápio`
                : `${pausedItems} oculto${pausedItems !== 1 ? "s" : ""} para clientes`}
            </p>
            {tab === "ativos" && (
              <button
                type="button"
                onClick={openNewProduct}
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/90 px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md shadow-black/25 transition-all hover:bg-primary"
              >
                <Plus className="size-4" />
                Novo produto
              </button>
            )}
          </div>

          {tab === "ativos" && (
            <button
              type="button"
              onClick={openNewProduct}
              className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-lg shadow-black/40 transition-transform hover:scale-[1.02] active:scale-[0.98] md:hidden"
              aria-label="Novo produto"
            >
              <Plus className="size-6" />
            </button>
          )}

          <Dialog
            open={productFormOpen}
            onOpenChange={(open) => {
              if (!open) closeProductForm();
              else setProductFormOpen(true);
            }}
          >
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar produto" : "Novo produto"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                  <input
                    value={itemForm.name}
                    onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: X-Burger Especial"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Categoria *</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm((f) => ({ ...f, categoryId: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  >
                    {menu.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Preço (R$) *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={itemForm.price}
                    onChange={(e) => setItemForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="29,90"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Custo unitário (CMV)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm((f) => ({ ...f, unitCost: e.target.value }))}
                    placeholder="12,50"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Usado no Financeiro para calcular lucro real.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Estoque atual
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={itemForm.stockQuantity}
                    onChange={(e) =>
                      setItemForm((f) => ({ ...f, stockQuantity: e.target.value }))
                    }
                    placeholder="vazio = não controlar"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Baixa automática quando o pedido é entregue.
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Estoque mínimo (alerta)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={itemForm.stockMin}
                    onChange={(e) => setItemForm((f) => ({ ...f, stockMin: e.target.value }))}
                    placeholder="0"
                    disabled={!itemForm.stockQuantity.trim()}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm disabled:opacity-50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                  <textarea
                    value={itemForm.description}
                    onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Ingredientes, tamanho, observações…"
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm resize-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <MenuImageUpload
                    tenantId={tenantId}
                    value={itemForm.imageUrl}
                    onChange={syncPreviewUrl}
                  />
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-2">
                  {[
                    { key: "isFeatured" as const, label: "Destaque", hint: "Aparece em Mais vendidos" },
                    { key: "isCombo" as const, label: "Combo", hint: "Seção de combos no cardápio" },
                    { key: "isDrink" as const, label: "Bebida", hint: "Sugestão de bebida no pedido" },
                  ].map((flag) => {
                    const active = itemForm[flag.key];
                    return (
                      <button
                        key={flag.key}
                        type="button"
                        title={flag.hint}
                        onClick={() =>
                          setItemForm((f) => ({ ...f, [flag.key]: !f[flag.key] }))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          active
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        {flag.label}
                      </button>
                    );
                  })}
                </div>
                <MenuProductOptionsEditor
                  variations={itemForm.variations}
                  addons={itemForm.addons}
                  onVariationsChange={(variations) => setItemForm((f) => ({ ...f, variations }))}
                  onAddonsChange={(addons) => setItemForm((f) => ({ ...f, addons }))}
                />
                <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Disponível no cardápio</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {itemForm.available
                        ? "Clientes podem ver e pedir este item"
                        : "Pausado — oculto para clientes até reativar"}
                    </p>
                  </div>
                  <Switch
                    checked={itemForm.available}
                    onCheckedChange={(checked) =>
                      setItemForm((f) => ({ ...f, available: checked }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => void saveItem()}
                  className="flex-1 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  {editingId ? "Salvar alterações" : "Adicionar ao cardápio"}
                </button>
                <button
                  type="button"
                  onClick={closeProductForm}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-surface-elevated/50"
                >
                  Cancelar
                </button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-10 pt-1 md:pt-0">{renderProductList(tab)}</div>
        </>
      ) : null}

      <MenuImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tenantId={tenantId}
        onImported={load}
      />

      <MenuBrandingDialog
        open={brandingOpen}
        onOpenChange={setBrandingOpen}
        tenantId={tenantId}
        tenantName={menu.tenant.name}
        menuUrl={menuUrl}
        settings={menu.settings}
        onSettingsChange={(settings) =>
          setMenu((prev) => (prev ? { ...prev, settings } : prev))
        }
      />
    </div>
  );
}
