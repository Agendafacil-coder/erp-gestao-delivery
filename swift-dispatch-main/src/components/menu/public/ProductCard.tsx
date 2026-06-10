import { Plus, Minus, Star } from "lucide-react";
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

/** Card de produto — grid (destaques) ou lista compacta */
export function ProductCard({
  item,
  categoryName,
  quantity,
  onOpenImage,
  onOpenDetails,
  onAdd,
  onRemove,
  justAdded,
  layout = "grid",
}: ProductCardProps) {
  const minPrice =
    item.variations.length > 0
      ? Math.min(item.price, ...item.variations.map((v) => v.price))
      : item.price;

  if (layout === "list") {
    return (
      <article
        className={cn(
          "relative flex gap-3 py-3",
          justAdded && "rounded-xl bg-[var(--menu-accent)]/5",
        )}
      >
        <button
          type="button"
          onClick={onOpenDetails}
          className="flex min-w-0 flex-1 flex-col items-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menu-accent)]/30 rounded-lg -m-1 p-1"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">{item.name}</h3>
            {item.is_combo ? (
              <span className="menu-badge menu-badge--hot">Combo</span>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--menu-muted)]">
              {item.description}
            </p>
          ) : null}
          <div className="mt-2">
            {item.variations.length > 0 ? (
              <span className="text-xs text-[var(--menu-muted)]">
                a partir de <span className="menu-price text-sm">{formatBRL(minPrice)}</span>
              </span>
            ) : (
              <span className="menu-price text-[15px]">{formatBRL(item.price)}</span>
            )}
          </div>
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={onOpenImage}
            className="block size-[88px] overflow-hidden rounded-xl bg-[var(--menu-card)] ring-1 ring-[var(--menu-border)]"
            aria-label={`Ver foto de ${item.name}`}
          >
            <MenuItemImage
              imageUrl={item.image_url}
              name={item.name}
              categoryName={categoryName}
              emojiClassName="text-2xl"
            />
          </button>
          <QtyControl
            quantity={quantity}
            onAdd={onAdd}
            onRemove={onRemove}
            itemName={item.name}
            className="absolute -bottom-2 -right-2"
          />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "menu-card group flex flex-col overflow-hidden text-left",
        justAdded && "ring-2 ring-[var(--menu-accent)]/40",
      )}
    >
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex flex-1 flex-col focus:outline-none"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--menu-surface)]">
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
              emojiClassName="text-4xl"
            />
          </button>
          {item.is_featured ? (
            <span className="menu-badge menu-badge--featured absolute left-2 top-2">
              <Star className="size-2.5 fill-current" />
              Destaque
            </span>
          ) : item.is_combo ? (
            <span className="menu-badge menu-badge--hot absolute left-2 top-2">Combo</span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</h3>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--menu-muted)]">
              {item.description}
            </p>
          ) : null}
          <div className="mt-auto pt-2">
            {item.variations.length > 0 ? (
              <span className="text-[11px] text-[var(--menu-muted)]">
                a partir de <span className="menu-price text-sm">{formatBRL(minPrice)}</span>
              </span>
            ) : (
              <span className="menu-price text-base">{formatBRL(item.price)}</span>
            )}
          </div>
        </div>
      </button>

      <div className="border-t border-[var(--menu-border)] p-2">
        <QtyControl
          quantity={quantity}
          onAdd={onAdd}
          onRemove={onRemove}
          itemName={item.name}
          fullWidth
        />
      </div>
    </article>
  );
}

function QtyControl({
  quantity,
  onAdd,
  onRemove,
  itemName,
  className,
  fullWidth,
}: {
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  itemName: string;
  className?: string;
  fullWidth?: boolean;
}) {
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        className={cn(
          "flex items-center justify-center rounded-xl bg-[var(--menu-gradient)] text-white shadow-sm transition-transform active:scale-95",
          fullWidth ? "h-9 w-full gap-1.5 text-xs font-semibold" : "size-8 rounded-full",
          className,
        )}
        aria-label={`Adicionar ${itemName}`}
      >
        <Plus className={fullWidth ? "size-3.5" : "size-4"} strokeWidth={2.5} />
        {fullWidth ? "Adicionar" : null}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl bg-[var(--menu-surface)] ring-1 ring-[var(--menu-border)]",
        fullWidth ? "h-9 px-1" : "rounded-full bg-[var(--menu-card)] p-0.5 shadow-md",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "flex items-center justify-center text-[var(--menu-accent)]",
          fullWidth ? "size-8 rounded-lg" : "size-8",
        )}
        aria-label="Remover um"
      >
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-[var(--menu-accent)]">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "flex items-center justify-center rounded-lg bg-[var(--menu-gradient)] text-white",
          fullWidth ? "size-8" : "size-8 rounded-full",
        )}
        aria-label="Adicionar um"
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
