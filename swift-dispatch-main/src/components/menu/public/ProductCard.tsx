import { Plus, Minus } from "lucide-react";
import { formatBRL, categoryEmoji } from "@/lib/menu/format";
import type { MenuItemDto } from "@/functions/menu";
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
};

export function ProductCard({
  item,
  categoryName,
  quantity,
  onOpenImage,
  onOpenDetails,
  onAdd,
  onRemove,
  justAdded,
}: ProductCardProps) {
  const hasImage = !!item.image_url;

  return (
    <article
      className={cn(
        "flex overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] transition-all duration-200",
        "hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
        justAdded && "ring-2 ring-[#ea1d2c]/30",
      )}
    >
      <button
        type="button"
        onClick={onOpenImage}
        className="relative h-[118px] w-[118px] shrink-0 cursor-zoom-in bg-gradient-to-br from-[#fff8f0] to-[#ffe8e0] focus:outline-none focus:ring-2 focus:ring-[#ea1d2c]/30 focus:ring-offset-2"
        aria-label={`Ver foto de ${item.name}`}
      >
        {hasImage ? (
          <img src={item.image_url!} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-4xl">
            {categoryEmoji(categoryName)}
          </div>
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenDetails}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenDetails();
            }
          }}
          className="flex flex-1 cursor-pointer flex-col justify-between py-3.5 pl-3.5 pr-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#ea1d2c]/20"
        >
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#1c1c1e]">
              {item.name}
            </h3>
            {item.description ? (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#888]">
                {item.description}
              </p>
            ) : null}
          </div>
          <p className="mt-2.5 text-base font-bold tabular-nums text-[#1c1c1e]">
            {formatBRL(item.price)}
          </p>
        </div>

        <div
          className="flex justify-end px-3 pb-3.5 pt-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="shrink-0 rounded-full bg-[#ea1d2c] px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95"
            >
              Adicionar
            </button>
          ) : (
            <div className="flex items-center gap-0.5 rounded-full bg-[#ea1d2c] p-0.5 text-white">
              <button
                type="button"
                onClick={onRemove}
                className="flex size-9 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Remover um"
              >
                <Minus className="size-4" strokeWidth={2.5} />
              </button>
              <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={onAdd}
                className="flex size-9 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Adicionar um"
              >
                <Plus className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
