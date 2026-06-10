import { useEffect, useState } from "react";
import {
  deleteMenuItemFn,
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
import { MenuSortableCategoryList } from "@/components/menu/admin/MenuSortableCategoryList";
import { Switch } from "@/components/ui/switch";
import { categoryEmoji } from "@/lib/menu/format";
import { toast } from "sonner";
import { MenuImageUpload } from "@/components/menu/admin/MenuImageUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Copy,
  ExternalLink,
  PauseCircle,
  UtensilsCrossed,
  FolderPlus,
  Package,
} from "lucide-react";

type MenuTab = "ativos" | "categorias" | "pausados";

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
});

export function MenuManager({ tenantId, tenantSlug }: MenuManagerProps) {
  const [menu, setMenu] = useState<PublicMenuPayload | null>(null);
  const [tab, setTab] = useState<MenuTab>("ativos");
  const [catName, setCatName] = useState("");
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm(""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);

  const menuUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${tenantSlug}` : "";

  const load = async () => {
    const data = await listMenuAdminFn({ data: { tenantId } });
    setMenu(data);
    if (data.categories[0] && !itemForm.categoryId) {
      setItemForm(emptyItemForm(data.categories[0].id));
    }
  };

  useEffect(() => {
    void load().catch((e) => toast.error((e as Error).message));
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
    });
    setProductFormOpen(true);
  };

  const syncPreviewUrl = (url: string) => {
    setItemForm((f) => ({ ...f, imageUrl: url }));
  };

  const rowToDto = (row: {
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    price: string;
    imageUrl: string | null;
    available: boolean;
    sortOrder: number;
    unitCost?: string | null;
    stockQuantity?: number | null;
    stockMin?: number | null;
  }): MenuItemDto => ({
    id: row.id,
    category_id: row.categoryId,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    image_url: row.imageUrl,
    available: row.available,
    sort_order: row.sortOrder,
    is_featured: false,
    is_combo: false,
    is_drink: false,
    sales_count: 0,
    unit_cost: row.unitCost != null ? Number(row.unitCost) : null,
    stock_quantity: row.stockQuantity ?? null,
    stock_min: row.stockMin ?? 0,
    variations: [],
    addons: [],
  });

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
      }),
    });
    const row = await res.json();
    if (!res.ok) throw new Error(row.error ?? "Falha ao salvar produto");
    const dto = rowToDto(row);
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

  if (!menu) {
    return (
      <div className="menu-admin animate-pulse max-w-3xl space-y-5">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-44 rounded-2xl bg-muted" />
      </div>
    );
  }

  const totalItems = menu.categories.reduce((s, c) => s + c.items.length, 0);
  const activeItems = menu.categories.reduce(
    (s, c) => s + c.items.filter((i) => i.available).length,
    0,
  );
  const pausedItems = totalItems - activeItems;

  const renderProductList = (listTab: "ativos" | "pausados") => {
    const cats = categoriesForTab(menu, listTab);
    if (cats.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground/80">
          {listTab === "pausados"
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
      {/* Header */}
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
            </p>
          </div>
          <a
            href={menuUrl}
            target="_blank"
            rel="noreferrer"
            className="erp-btn-secondary"
          >
            <ExternalLink className="size-4 opacity-70" />
            Ver como cliente
          </a>
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
          <ul className="divide-y divide-white/[0.06]">
            {menu.categories.map((cat) => (
              <li key={cat.id} className="flex justify-between py-3.5 text-sm">
                <span className="font-medium text-foreground/90">{cat.name}</span>
                <span className="tabular-nums text-muted-foreground">{cat.items.length} itens</span>
              </li>
            ))}
          </ul>
        </section>
      ) : tab === "ativos" || tab === "pausados" ? (
        <>
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
    </div>
  );
}
