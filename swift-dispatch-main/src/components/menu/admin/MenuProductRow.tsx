import { useState } from "react";
import {
  duplicateMenuItemFn,
  patchMenuItemFn,
  toggleMenuItemFn,
  type MenuItemDto,
  type PublicMenuPayload,
} from "@/functions/menu";
import {
  addMenuItemToPayload,
  parsePriceInput,
  setMenuItemInPayload,
} from "@/lib/menu/admin-state";
import { formatBRL, categoryEmoji } from "@/lib/menu/format";
import { isMenuItemLowStock } from "@/lib/menu/menu-stock";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Copy,
  FolderInput,
  GripVertical,
  Minus,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraggableAttributes } from "@dnd-kit/core";

type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners?: Record<string, unknown>;
  isDragging?: boolean;
};

type MenuProductRowProps = {
  item: MenuItemDto;
  categoryId: string;
  categoryName: string;
  listTab: "ativos" | "pausados";
  tenantId: string;
  categories: PublicMenuPayload["categories"];
  menu: PublicMenuPayload;
  onMenuChange: (menu: PublicMenuPayload) => void;
  onEdit: (item: MenuItemDto, categoryId: string) => void;
  onDelete: (itemId: string) => Promise<void>;
  onAvailabilityChange?: (available: boolean) => void;
  dragHandle?: DragHandleProps;
};

export function MenuProductRow({
  item,
  categoryId,
  categoryName,
  listTab: _listTab,
  tenantId,
  categories,
  menu,
  onMenuChange,
  onEdit,
  onDelete,
  onAvailabilityChange,
  dragHandle,
}: MenuProductRowProps) {
  const [busy, setBusy] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [editingStock, setEditingStock] = useState(false);
  const [stockDraft, setStockDraft] = useState("");

  const isPaused = !item.available;

  const runOptimistic = async (
    nextMenu: PublicMenuPayload,
    action: () => Promise<void>,
    successMsg: string,
  ) => {
    const snapshot = menu;
    onMenuChange(nextMenu);
    setBusy(true);
    try {
      await action();
      toast.success(successMsg);
    } catch (e) {
      onMenuChange(snapshot);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleAvailable = async (available: boolean) => {
    const nextItem = { ...item, available };
    const nextMenu = setMenuItemInPayload(menu, item.id, nextItem, categoryId);
    await runOptimistic(
      nextMenu,
      async () => {
        await toggleMenuItemFn({ data: { tenantId, itemId: item.id, available } });
      },
      available ? "Produto ativado" : "Produto pausado",
    );
    onAvailabilityChange?.(available);
  };

  const saveInlinePrice = async () => {
    const price = parsePriceInput(priceDraft);
    if (price === null) {
      toast.error("Preço inválido");
      return;
    }
    if (price === item.price) {
      setEditingPrice(false);
      return;
    }
    const nextItem = { ...item, price };
    const nextMenu = setMenuItemInPayload(menu, item.id, nextItem, categoryId);
    await runOptimistic(
      nextMenu,
      async () => {
        await patchMenuItemFn({ data: { tenantId, itemId: item.id, price } });
      },
      "Preço atualizado",
    );
    setEditingPrice(false);
  };

  const moveToCategory = async (targetCategoryId: string) => {
    if (targetCategoryId === categoryId) return;
    const nextItem = { ...item, category_id: targetCategoryId };
    const nextMenu = setMenuItemInPayload(menu, item.id, nextItem, targetCategoryId);
    await runOptimistic(
      nextMenu,
      async () => {
        await patchMenuItemFn({
          data: { tenantId, itemId: item.id, categoryId: targetCategoryId },
        });
      },
      "Categoria alterada",
    );
  };

  const duplicate = async () => {
    setBusy(true);
    try {
      const copy = await duplicateMenuItemFn({ data: { tenantId, itemId: item.id } });
      onMenuChange(addMenuItemToPayload(menu, copy, copy.category_id));
      toast.success("Produto duplicado (pausado)");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startPriceEdit = () => {
    setPriceDraft(String(item.price).replace(".", ","));
    setEditingPrice(true);
  };

  const patchStock = async (stockQuantity: number | null, stockMin?: number) => {
    const nextMin = stockMin ?? item.stock_min ?? 0;
    const nextAvailable =
      stockQuantity != null && stockQuantity > 0 && !item.available && (item.stock_quantity ?? 0) === 0
        ? true
        : item.available;
    const nextItem = {
      ...item,
      stock_quantity: stockQuantity,
      stock_min: nextMin,
      available: nextAvailable,
    };
    const nextMenu = setMenuItemInPayload(menu, item.id, nextItem, categoryId);
    await runOptimistic(
      nextMenu,
      async () => {
        await patchMenuItemFn({
          data: {
            tenantId,
            itemId: item.id,
            stockQuantity,
            ...(stockMin !== undefined ? { stockMin } : {}),
            ...(nextAvailable !== item.available ? { available: nextAvailable } : {}),
          },
        });
      },
      stockQuantity == null ? "Controle de estoque removido" : "Estoque atualizado",
    );
    if (nextAvailable && !item.available) onAvailabilityChange?.(true);
  };

  const saveInlineStock = async () => {
    const raw = stockDraft.trim();
    if (!raw) {
      setEditingStock(false);
      return;
    }
    const qty = parseInt(raw.replace(/\D/g, ""), 10);
    if (Number.isNaN(qty) || qty < 0) {
      toast.error("Estoque inválido");
      return;
    }
    if (qty === item.stock_quantity) {
      setEditingStock(false);
      return;
    }
    await patchStock(qty);
    setEditingStock(false);
  };

  const adjustStock = async (delta: number) => {
    if (item.stock_quantity == null) return;
    const next = Math.max(0, item.stock_quantity + delta);
    if (next === item.stock_quantity) return;
    await patchStock(next);
  };

  const enableStockTracking = async () => {
    await patchStock(0, item.stock_min ?? 0);
  };

  const startStockEdit = () => {
    if (item.stock_quantity == null) return;
    setStockDraft(String(item.stock_quantity));
    setEditingStock(true);
  };

  return (
    <li
      className={cn(
        "group flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5 transition-all duration-200 min-w-0",
        "border-border bg-card hover:border-border-strong hover:bg-muted/50",
        isPaused && "opacity-[0.72] saturate-[0.85]",
        dragHandle?.isDragging && "shadow-[var(--shadow-lift)] ring-1 ring-border",
        busy && "pointer-events-none opacity-50",
      )}
    >
      {/* Esquerda: imagem + conteúdo */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
        {dragHandle ? (
          <button
            type="button"
            className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
            aria-label="Arrastar para reordenar"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <div className="relative size-[52px] shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border">
          {item.image_url ? (
            <img src={item.image_url} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-lg">
              {categoryEmoji(categoryName)}
            </span>
          )}
          {isPaused && (
            <span
              className="absolute bottom-1 right-1 size-2 rounded-full bg-amber-400/90 ring-2 ring-card"
              title="Indisponível no cardápio"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-[15px] font-medium leading-snug text-foreground/95">
            {item.name}
          </p>
          {item.description ? (
            <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground/80">
              {item.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1 pt-1">
            {item.is_featured ? (
              <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">
                Destaque
              </span>
            ) : null}
            {item.is_combo ? (
              <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full border border-border px-1.5 py-0.5 text-muted-foreground">
                Combo
              </span>
            ) : null}
            {item.is_drink ? (
              <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full border border-border px-1.5 py-0.5 text-muted-foreground">
                Bebida
              </span>
            ) : null}
            {item.variations.length > 0 ? (
              <span className="text-[9px] font-medium rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground tabular-nums">
                {item.variations.length} tam.
              </span>
            ) : null}
            {item.addons.length > 0 ? (
              <span className="text-[9px] font-medium rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground tabular-nums">
                +{item.addons.length} extra{item.addons.length === 1 ? "" : "s"}
              </span>
            ) : null}
            {item.stock_quantity != null ? (
              <span className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => void adjustStock(-1)}
                  className="size-5 rounded-md border border-border text-muted-foreground hover:bg-muted flex items-center justify-center"
                  aria-label="Diminuir estoque"
                >
                  <Minus className="size-2.5" />
                </button>
                {editingStock ? (
                  <input
                    autoFocus
                    value={stockDraft}
                    onChange={(e) => setStockDraft(e.target.value)}
                    onBlur={() => void saveInlineStock()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveInlineStock();
                      if (e.key === "Escape") setEditingStock(false);
                    }}
                    className="w-10 rounded-md border border-border bg-background px-1 py-0.5 text-[9px] font-medium tabular-nums text-center outline-none ring-1 ring-primary/30"
                    inputMode="numeric"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={startStockEdit}
                    className={cn(
                      "text-[9px] font-medium rounded-full px-1.5 py-0.5 tabular-nums min-w-[2.5rem]",
                      isMenuItemLowStock(item.stock_quantity, item.stock_min)
                        ? "bg-warning/15 text-warning"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                    title="Clique para editar estoque"
                  >
                    Est. {item.stock_quantity}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void adjustStock(1)}
                  className="size-5 rounded-md border border-border text-muted-foreground hover:bg-muted flex items-center justify-center"
                  aria-label="Aumentar estoque"
                >
                  <Plus className="size-2.5" />
                </button>
              </span>
            ) : null}
          </div>
          <div className="pt-0.5">
            {editingPrice ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">R$</span>
                <input
                  autoFocus
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  onBlur={() => void saveInlinePrice()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void saveInlinePrice();
                    if (e.key === "Escape") setEditingPrice(false);
                  }}
                  className="w-[5.5rem] rounded-md border border-border bg-background px-2 py-0.5 text-sm font-medium tabular-nums text-foreground outline-none ring-1 ring-primary/30"
                  inputMode="decimal"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={startPriceEdit}
                className="text-sm font-semibold tabular-nums text-foreground/90 transition-colors hover:text-primary"
                title="Clique para alterar o preço"
              >
                {formatBRL(item.price)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Direita: toggle + menu */}
      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-1.5 w-full sm:w-auto">
        <Switch
          checked={item.available}
          onCheckedChange={(checked) => void toggleAvailable(checked)}
          aria-label={item.available ? "Pausar produto" : "Ativar produto"}
          className="h-4 w-7 shrink-0 border-0 data-[state=checked]:bg-primary/75 data-[state=unchecked]:bg-muted [&>span]:size-3 [&>span]:data-[state=checked]:translate-x-3"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="touch-target flex size-10 sm:size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Mais ações"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 border-border bg-popover p-1 shadow-[var(--shadow-lift)]"
          >
            <DropdownMenuItem
              className="rounded-md text-sm focus:bg-muted"
              onClick={() => onEdit(item, categoryId)}
            >
              <Pencil className="mr-2 size-4 opacity-70" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="rounded-md text-sm focus:bg-muted"
              onClick={() => void duplicate()}
            >
              <Copy className="mr-2 size-4 opacity-70" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-md text-sm focus:bg-muted">
                <FolderInput className="mr-2 size-4 opacity-70" />
                Mover categoria
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="border-border bg-popover">
                {categories.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    disabled={c.id === categoryId}
                    className="text-sm focus:bg-muted"
                    onClick={() => void moveToCategory(c.id)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {item.stock_quantity != null ? (
              <DropdownMenuItem
                className="rounded-md text-sm focus:bg-muted"
                onClick={() => void patchStock(null)}
              >
                Remover controle de estoque
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="rounded-md text-sm focus:bg-muted"
                onClick={() => void enableStockTracking()}
              >
                Ativar controle de estoque
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            {item.available ? (
              <DropdownMenuItem
                className="rounded-md text-sm focus:bg-white/[0.06]"
                onClick={() => void toggleAvailable(false)}
              >
                <PauseCircle className="mr-2 size-4 opacity-70" />
                Pausar produto
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="rounded-md text-sm focus:bg-white/[0.06]"
                onClick={() => void toggleAvailable(true)}
              >
                <PlayCircle className="mr-2 size-4 opacity-70" />
                Ativar produto
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              className="rounded-md text-sm text-danger focus:bg-danger/10 focus:text-danger"
              onClick={() => void onDelete(item.id)}
            >
              <Trash2 className="mr-2 size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
