import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuFeaturedStripProps = {
  items: MenuItemDto[];
  onSelect: (item: MenuItemDto) => void;
  pageMax: string;
};

/** Destaques compactos — layout Limpo */
export function MenuFeaturedStrip({ items, onSelect, pageMax }: MenuFeaturedStripProps) {
  if (!items.length) return null;

  return (
    <section className={cn("px-4 pt-4", pageMax, "mx-auto w-full")}>
      <div className="mb-2.5 flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-[var(--menu-accent)]" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--menu-muted)]">
          Populares agora
        </h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="menu-featured-chip flex shrink-0 items-center gap-2 rounded-full border border-[var(--menu-border)] bg-[var(--menu-card)] px-3.5 py-2 text-left shadow-sm transition-colors hover:border-[var(--menu-accent)]/30 hover:bg-[var(--menu-surface)]"
          >
            <span className="max-w-[9rem] truncate text-sm font-medium text-[var(--menu-fg)]">
              {item.name}
            </span>
            <span className="menu-price text-xs font-bold">{formatBRL(item.price)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
