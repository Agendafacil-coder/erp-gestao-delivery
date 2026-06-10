import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { Flame, Package } from "lucide-react";
import { MenuItemImage } from "@/components/menu/public/MenuItemImage";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";

type MenuProductRailProps = {
  title: string;
  icon?: "flame" | "combo";
  items: MenuItemDto[];
  categoryNameFor: (itemId: string) => string;
  onSelect: (item: MenuItemDto) => void;
};

export function MenuProductRail({
  title,
  icon,
  items,
  categoryNameFor,
  onSelect,
}: MenuProductRailProps) {
  if (!items.length) return null;

  return (
    <section className="border-b border-[var(--menu-border)] py-4">
      <div className={cn("mb-3 flex items-center justify-between px-4", MENU_PAGE_MAX, "mx-auto w-full")}>
        <div className="flex items-center gap-2">
          {icon === "flame" ? (
            <Flame className="size-4 shrink-0 text-[var(--menu-accent)]" />
          ) : icon === "combo" ? (
            <Package className="size-4 shrink-0 text-[var(--menu-accent)]" />
          ) : null}
          <h2 className="menu-section-title">{title}</h2>
        </div>
        {icon === "flame" && (
          <span className="text-[11px] text-[var(--menu-muted)]">Os favoritos 🔥</span>
        )}
      </div>
      <div
        className={cn(
          "mx-auto flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none",
          MENU_PAGE_MAX,
          "w-full",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-[140px] shrink-0 text-left"
          >
            <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-2xl bg-[var(--menu-card)] ring-1 ring-[var(--menu-border)]">
              <MenuItemImage
                imageUrl={item.image_url}
                name={item.name}
                categoryName={
                  categoryNameFor(item.id) || (item.is_combo ? "combo" : "")
                }
                emojiClassName="text-4xl"
              />
              <span className="menu-badge menu-badge--hot absolute left-2 top-2">
                {icon === "combo" ? "Combo" : "Top"}
              </span>
            </div>
            <p className="line-clamp-2 text-[13px] font-semibold leading-tight">
              {item.name}
            </p>
            <p className="menu-price mt-0.5 text-sm">{formatBRL(item.price)}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
