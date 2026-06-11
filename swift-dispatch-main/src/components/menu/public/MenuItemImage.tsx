import { useEffect, useState } from "react";
import { pickMenuPlaceholderImage } from "@/lib/menu/menu-placeholders";
import { resolveMenuImageUrl } from "@/lib/menu/resolve-menu-image";
import { cn } from "@/lib/utils";

type MenuItemImageProps = {
  imageUrl?: string | null;
  name: string;
  categoryName?: string;
  isCombo?: boolean;
  isDrink?: boolean;
  itemId?: string;
  className?: string;
  fallbackClassName?: string;
  withShine?: boolean;
};

/** Imagem com fallback inteligente — nunca exibe ícone quebrado no cardápio */
export function MenuItemImage({
  imageUrl,
  name,
  categoryName = "",
  isCombo,
  isDrink,
  itemId,
  className,
  fallbackClassName = "text-lg font-bold text-[var(--menu-muted)]",
  withShine = true,
}: MenuItemImageProps) {
  const ctx = { imageUrl, name, categoryName, isCombo, isDrink, id: itemId };
  const primary = resolveMenuImageUrl(ctx);
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(primary);
    setFailed(false);
  }, [primary]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-gradient-to-br from-[oklch(0.22_0.02_55)] to-[oklch(0.16_0.015_55)]",
          className,
        )}
        aria-hidden
      >
        <span className={fallbackClassName}>{name.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <div className={cn("size-full", withShine && "menu-image-shine")}>
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn("size-full object-cover transition-transform duration-500 group-hover:scale-105", className)}
        onError={() => {
          const fallback = pickMenuPlaceholderImage(ctx);
          if (src !== fallback) {
            setSrc(fallback);
            return;
          }
          setFailed(true);
        }}
      />
    </div>
  );
}
