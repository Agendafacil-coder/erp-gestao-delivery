import { Plus } from "lucide-react";
import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { MenuItemImage } from "@/components/menu/public/MenuItemImage";
import { cn } from "@/lib/utils";

type Props = {
  item: MenuItemDto;
  onAdd: () => void;
  className?: string;
};

/** Sugestão de upsell no carrinho/checkout (order bump). */
export function OrderBumpCard({ item, onAdd, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-[var(--menu-accent)]/25 bg-[var(--menu-accent)]/8 p-3",
        className,
      )}
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-[var(--menu-card)] ring-1 ring-[var(--menu-border)]">
        <MenuItemImage
          imageUrl={item.image_url}
          name={item.name}
          categoryName="bebida"
          fallbackClassName="text-2xl font-bold text-[var(--menu-muted)]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--menu-accent)]">
          Aproveite e adicione
        </p>
        <p className="truncate text-sm font-semibold">{item.name}</p>
        <p className="text-xs text-[var(--menu-muted)]">
          por apenas <span className="menu-price">{formatBRL(item.price)}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--menu-gradient)] text-white shadow-sm transition-transform active:scale-95"
        aria-label={`Adicionar ${item.name}`}
      >
        <Plus className="size-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
