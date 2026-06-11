import { Plus, Minus, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/menu/format";
import type { MenuItemDto } from "@/functions/menu";
import { MenuItemImage } from "@/components/menu/public/MenuItemImage";
import { cn } from "@/lib/utils";

type ProductCardProps = {
  item: MenuItemDto;
  categoryName: string;
  quantity: number;
  onOpenImage: () => void;
  onOpenDetails: () => void;
  onAdd: () => void;
  onRemove: () => void;
  justAdded?: boolean;
  layout?: "grid" | "list";
};

/** Card de produto — lista premium (padrão) ou grid em telas largas */
export function ProductCard({
  item,
  categoryName,
  quantity,
  onOpenImage,
  onOpenDetails,
  onAdd,
  onRemove,
  justAdded,
  layout = "list",
}: ProductCardProps) {
  const minPrice =
    item.variations.length > 0
      ? Math.min(item.price, ...item.variations.map((v) => v.price))
      : item.price;
  const hasOptions = item.variations.length > 0 || item.addons.length > 0;

  if (layout === "grid") {
    return (
      <article
        className={cn(
          "menu-card group flex flex-col overflow-hidden text-left",
          justAdded && "ring-2 ring-[var(--menu-accent)]/45 shadow-[var(--menu-glow)]",
        )}
      >
        <button type="button" onClick={onOpenDetails} className="flex flex-1 flex-col focus:outline-none">
          <div className="relative aspect-[5/4] w-full overflow-hidden bg-[var(--menu-surface)]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenImage();
              }}
              className="size-full"
              aria-label={`Ver foto de ${item.name}`}
            >
              <MenuItemImage
                imageUrl={item.image_url}
                name={item.name}
                categoryName={categoryName}
                isCombo={item.is_combo}
                isDrink={item.is_drink}
                itemId={item.id}
                fallbackClassName="text-4xl font-bold text-[var(--menu-muted)]"
              />
            </button>
            <ProductBadge item={item} className="absolute left-2.5 top-2.5" />
          </div>

          <div className="flex flex-1 flex-col p-3.5">
            <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug">
              {item.name}
            </h3>
            {item.description ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--menu-muted)]">
                {item.description}
              </p>
            ) : null}
            <div className="mt-auto pt-2.5">
              <PriceLabel price={item.price} minPrice={minPrice} hasVariations={item.variations.length > 0} />
            </div>
          </div>
        </button>

        <div className="border-t border-[var(--menu-border)] p-2.5">
          <QtyControl
            quantity={quantity}
            onAdd={onAdd}
            onRemove={onRemove}
            itemName={item.name}
            hasOptions={hasOptions}
            fullWidth
          />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "menu-card menu-card--list group relative overflow-hidden p-3 sm:p-3.5",
        justAdded && "ring-2 ring-[var(--menu-accent)]/40 shadow-[var(--menu-glow)]",
      )}
    >
      <div className="flex gap-3.5 sm:gap-4">
        <button
          type="button"
          onClick={onOpenDetails}
          className="flex min-w-0 flex-1 flex-col items-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/30 rounded-xl -m-1 p-1"
        >
          <div className="flex w-full flex-wrap items-center gap-1.5 pr-1">
            <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug sm:text-base">
              {item.name}
            </h3>
            {item.is_combo ? (
              <span className="menu-badge menu-badge--hot">Combo</span>
            ) : item.is_featured ? (
              <span className="menu-badge menu-badge--featured">
                <Sparkles className="size-2.5" />
                Destaque
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--menu-muted)] sm:text-[13px]">
              {item.description}
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <PriceLabel price={item.price} minPrice={minPrice} hasVariations={item.variations.length > 0} />
            {hasOptions ? (
              <span className="menu-badge menu-badge--custom">Com opções</span>
            ) : null}
          </div>
        </button>

        <div className="relative shrink-0 self-start">
          <button
            type="button"
            onClick={onOpenImage}
            className="block size-[5.75rem] overflow-hidden rounded-2xl bg-[var(--menu-surface)] ring-1 ring-[var(--menu-border)] sm:size-[6.25rem]"
            aria-label={`Ver foto de ${item.name}`}
          >
            <MenuItemImage
              imageUrl={item.image_url}
              name={item.name}
              categoryName={categoryName}
              isCombo={item.is_combo}
              isDrink={item.is_drink}
              itemId={item.id}
              fallbackClassName="text-3xl font-bold text-[var(--menu-muted)]"
            />
          </button>
          <QtyControl
            quantity={quantity}
            onAdd={onAdd}
            onRemove={onRemove}
            itemName={item.name}
            hasOptions={hasOptions}
            className="absolute -bottom-2 -right-2"
          />
        </div>
      </div>
    </article>
  );
}

function ProductBadge({ item, className }: { item: MenuItemDto; className?: string }) {
  if (item.is_featured) {
    return (
      <span className={cn("menu-badge menu-badge--featured", className)}>
        <Sparkles className="size-2.5" />
        Destaque
      </span>
    );
  }
  if (item.is_combo) {
    return <span className={cn("menu-badge menu-badge--hot", className)}>Combo</span>;
  }
  return null;
}

function PriceLabel({
  price,
  minPrice,
  hasVariations,
}: {
  price: number;
  minPrice: number;
  hasVariations: boolean;
}) {
  if (hasVariations) {
    return (
      <span className="text-xs text-[var(--menu-muted)]">
        a partir de <span className="menu-price text-base sm:text-lg">{formatBRL(minPrice)}</span>
      </span>
    );
  }
  return <span className="menu-price text-base sm:text-lg">{formatBRL(price)}</span>;
}

function QtyControl({
  quantity,
  onAdd,
  onRemove,
  itemName,
  hasOptions,
  className,
  fullWidth,
}: {
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  itemName: string;
  hasOptions?: boolean;
  className?: string;
  fullWidth?: boolean;
}) {
  if (quantity === 0) {
    const showChooseLabel = hasOptions && !fullWidth;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className={cn(
          "flex items-center justify-center bg-[var(--menu-gradient)] text-white shadow-[var(--menu-glow)] transition-transform active:scale-95",
          fullWidth
            ? "h-10 w-full gap-2 rounded-xl text-sm font-semibold"
            : showChooseLabel
              ? "h-9 min-w-[4.75rem] gap-1 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wide shadow-lg"
              : "size-9 rounded-full shadow-lg",
          className,
        )}
        aria-label={hasOptions ? `Escolher ${itemName}` : `Adicionar ${itemName}`}
      >
        <Plus className="size-3.5 shrink-0" strokeWidth={2.5} />
        {fullWidth ? (hasOptions ? "Escolher" : "Adicionar") : showChooseLabel ? "Escolher" : null}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-full bg-[var(--menu-card)] ring-1 ring-[var(--menu-border)] shadow-lg",
        fullWidth ? "h-10 rounded-xl px-1" : "p-0.5",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onRemove}
        className="flex size-8 items-center justify-center rounded-full text-[var(--menu-accent)] transition-colors hover:bg-[var(--menu-surface)]"
        aria-label="Remover um"
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-[var(--menu-fg)]">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="flex size-8 items-center justify-center rounded-full bg-[var(--menu-gradient)] text-white"
        aria-label="Adicionar um"
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
