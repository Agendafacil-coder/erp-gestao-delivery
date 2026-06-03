import { categoryEmoji } from "@/lib/menu/format";
import { cn } from "@/lib/utils";

type MenuItemImageProps = {
  imageUrl?: string | null;
  name: string;
  categoryName?: string;
  className?: string;
  emojiClassName?: string;
};

/** Imagem ou placeholder consistente em todo o cardápio público */
export function MenuItemImage({
  imageUrl,
  name,
  categoryName = "",
  className,
  emojiClassName = "text-3xl",
}: MenuItemImageProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={cn("size-full object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-[#f3f3f5]",
        className,
      )}
      aria-hidden
    >
      <span className={emojiClassName}>{categoryEmoji(categoryName)}</span>
    </div>
  );
}
