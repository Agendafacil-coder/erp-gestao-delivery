import { Plus, Minus } from "lucide-react";
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
};

/** Card de produto — texto à esquerda, foto e ação à direita (padrão delivery mobile) */
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
  const priceLabel =
    item.variations.length > 0 ? (
      <span className="text-[13px] font-semibold text-[#888]">
        a partir de{" "}
        <span className="text-[#1c1c1e]">
          {formatBRL(Math.min(item.price, ...item.variations.map((v) => v.price)))}
        </span>
      </span>
    ) : (
      <span className="text-[15px] font-bold tabular-nums text-[#1c1c1e]">
        {formatBRL(item.price)}
      </span>
    );

  return (
    <article
      className={cn(
        "relative flex gap-3 py-4",
        justAdded && "bg-[#fff8f8]",
      )}
    >
      <button
        type="button"
        onClick={onOpenDetails}
        className="flex min-w-0 flex-1 flex-col items-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ea1d2c]/25 rounded-lg -m-1 p-1"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-[#1c1c1e]">
            {item.name}
          </h3>
          {item.is_combo ? (
            <span className="shrink-0 rounded bg-[#fff0f0] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#ea1d2c]">
              Combo
            </span>
          ) : null}
          {item.is_featured ? (
            <span className="shrink-0 rounded bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-600">
              Top
            </span>
          ) : null}
        </div>
        {item.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#888]">
            {item.description}
          </p>
        ) : null}
        <div className="mt-2">{priceLabel}</div>
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onOpenImage}
          className="block size-[88px] overflow-hidden rounded-xl bg-[#f3f3f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ea1d2c]/30"
          aria-label={`Ver foto de ${item.name}`}
        >
          <MenuItemImage
            imageUrl={item.image_url}
            name={item.name}
            categoryName={categoryName}
            emojiClassName="text-2xl"
          />
        </button>

        <div
          className="absolute -bottom-2 -right-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {quantity === 0 ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex size-8 items-center justify-center rounded-full bg-[#ea1d2c] text-white shadow-md active:scale-95"
              aria-label={`Adicionar ${item.name}`}
            >
              <Plus className="size-4" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex items-center rounded-full border border-[#ea1d2c]/20 bg-white shadow-md">
              <button
                type="button"
                onClick={onRemove}
                className="flex size-8 items-center justify-center text-[#ea1d2c]"
                aria-label="Remover um"
              >
                <Minus className="size-4" strokeWidth={2.5} />
              </button>
              <span className="min-w-[1.25rem] text-center text-sm font-bold tabular-nums text-[#ea1d2c]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={onAdd}
                className="flex size-8 items-center justify-center rounded-full bg-[#ea1d2c] text-white"
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
