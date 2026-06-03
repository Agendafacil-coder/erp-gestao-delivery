import type { MenuItemDto } from "@/functions/menu";
import { formatBRL, categoryEmoji } from "@/lib/menu/format";
import { Flame, Package } from "lucide-react";

type MenuProductRailProps = {
  title: string;
  icon?: "flame" | "combo";
  items: MenuItemDto[];
  onSelect: (item: MenuItemDto) => void;
};

export function MenuProductRail({ title, icon, items, onSelect }: MenuProductRailProps) {
  if (!items.length) return null;

  return (
    <section className="mb-2">
      <div className="mb-3 flex items-center gap-2 px-4">
        {icon === "flame" ? (
          <Flame className="size-4 text-orange-500" />
        ) : icon === "combo" ? (
          <Package className="size-4 text-[#ea1d2c]" />
        ) : null}
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1c1c1e]">
          {title}
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none snap-x snap-mandatory">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-[140px] shrink-0 snap-start rounded-2xl border border-black/[0.06] bg-white p-2.5 text-left shadow-[0_2px_12px_rgba(0,0,0,0.05)] active:scale-[0.98]"
          >
            <div className="mb-2 aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#fff8f0] to-[#ffe8e0]">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-3xl">
                  {categoryEmoji(item.is_combo ? "combo" : "")}
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-[#1c1c1e]">
              {item.name}
            </p>
            <p className="mt-1 text-sm font-bold text-[#ea1d2c]">{formatBRL(item.price)}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
