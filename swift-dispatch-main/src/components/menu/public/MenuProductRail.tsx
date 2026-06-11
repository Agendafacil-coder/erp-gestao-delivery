import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { Flame, Package, ChevronRight } from "lucide-react";
import { MenuItemImage } from "@/components/menu/public/MenuItemImage";
import { MENU_PAGE_MAX } from "@/components/menu/public/menu-layout";
import { cn } from "@/lib/utils";

type MenuProductRailProps = {
  title: string;
  subtitle?: string;
  icon?: "flame" | "combo";
  items: MenuItemDto[];
  categoryNameFor: (itemId: string) => string;
  onSelect: (item: MenuItemDto) => void;
};

export function MenuProductRail({
  title,
  subtitle,
  icon,
  items,
  categoryNameFor,
  onSelect,
}: MenuProductRailProps) {
  if (!items.length) return null;

  return (
    <section className="py-5">
      <div className={cn("mb-3.5 flex items-end justify-between px-4", MENU_PAGE_MAX, "mx-auto w-full")}>
        <div>
          <div className="flex items-center gap-2">
            {icon === "flame" ? (
              <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--menu-accent)]/15 text-[var(--menu-accent)]">
                <Flame className="size-4" />
              </span>
            ) : icon === "combo" ? (
              <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--menu-accent)]/15 text-[var(--menu-accent)]">
                <Package className="size-4" />
              </span>
            ) : null}
            <h2 className="menu-section-title">{title}</h2>
          </div>
          {subtitle ? (
            <p className="menu-section-subtitle mt-1 pl-9">{subtitle}</p>
          ) : icon === "flame" ? (
            <p className="menu-section-subtitle mt-1 pl-9">Os favoritos da casa</p>
          ) : null}
        </div>
        <ChevronRight className="size-4 text-[var(--menu-muted)] opacity-50" aria-hidden />
      </div>

      <div
        className={cn(
          "menu-rail-fade mx-auto flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:gap-4",
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
            className="group w-[9.5rem] shrink-0 snap-start text-left sm:w-[10.5rem]"
          >
            <div className="menu-card relative mb-2.5 aspect-[4/5] w-full overflow-hidden p-0">
              <MenuItemImage
                imageUrl={item.image_url}
                name={item.name}
                categoryName={categoryNameFor(item.id) || (item.is_combo ? "combo" : "")}
                isCombo={item.is_combo}
                isDrink={item.is_drink}
                itemId={item.id}
                emojiClassName="text-4xl"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[oklch(0.11_0.012_55/90)] to-transparent" />
              <span className="menu-badge menu-badge--hot absolute left-2.5 top-2.5 backdrop-blur-sm">
                {icon === "combo" ? "Combo" : "Top"}
              </span>
              <span className="absolute bottom-2.5 left-2.5 right-2.5 menu-price text-sm drop-shadow-sm">
                {formatBRL(item.price)}
              </span>
            </div>
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug transition-colors group-hover:text-[var(--menu-accent)]">
              {item.name}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
