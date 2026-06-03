import type { MenuItemDto } from "@/functions/menu";
import { formatBRL } from "@/lib/menu/format";
import { Flame, Package } from "lucide-react";
import { MenuItemImage } from "@/components/menu/public/MenuItemImage";

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
    <section className="border-b border-black/[0.06] bg-white py-4">
      <div className="mb-3 flex items-center gap-2 px-4">
        {icon === "flame" ? (
          <Flame className="size-4 shrink-0 text-orange-500" />
        ) : icon === "combo" ? (
          <Package className="size-4 shrink-0 text-[#ea1d2c]" />
        ) : null}
        <h2 className="text-sm font-bold text-[#1c1c1e]">{title}</h2>
      </div>
      <div
        className="flex gap-3 overflow-x-auto px-4 pb-0.5 scrollbar-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-[128px] shrink-0 text-left active:opacity-90"
          >
            <div className="mb-2 size-[128px] overflow-hidden rounded-xl bg-[#f3f3f5]">
              <MenuItemImage
                imageUrl={item.image_url}
                name={item.name}
                categoryName={
                  categoryNameFor(item.id) || (item.is_combo ? "combo" : "")
                }
                emojiClassName="text-4xl"
              />
            </div>
            <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-[#1c1c1e]">
              {item.name}
            </p>
            <p className="mt-0.5 text-[13px] font-bold text-[#ea1d2c]">
              {formatBRL(item.price)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
