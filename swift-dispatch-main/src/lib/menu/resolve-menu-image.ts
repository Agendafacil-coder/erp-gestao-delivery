import { pickMenuPlaceholderImage } from "@/lib/menu/menu-placeholders";

export type MenuImageContext = {
  imageUrl?: string | null;
  name: string;
  categoryName?: string;
  isCombo?: boolean;
  isDrink?: boolean;
  id?: string;
};

/** URL exibida no cardápio público — placeholder inteligente quando não há foto. */
export function resolveMenuImageUrl(ctx: MenuImageContext): string {
  const trimmed = ctx.imageUrl?.trim();
  if (trimmed) return trimmed;
  return pickMenuPlaceholderImage(ctx);
}
