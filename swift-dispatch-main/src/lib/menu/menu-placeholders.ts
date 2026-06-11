/** URLs públicas (Unsplash) para preencher produtos sem foto em dev/demo. */
export const MENU_PLACEHOLDER_IMAGES = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
  fries: "https://images.unsplash.com/photo-1573080496219-bb080063c599?w=600&q=80",
  combo: "https://images.unsplash.com/photo-1550547660-d9450f1790ea?w=600&q=80",
  soda: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&q=80",
  juice: "https://images.unsplash.com/photo-1622597467836-f3285f2133b2?w=600&q=80",
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80",
  dessert: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80",
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80",
} as const;

const FALLBACK_POOL = Object.values(MENU_PLACEHOLDER_IMAGES);

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function hashPick(seed: string, pool: readonly string[]): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length]!;
}

export function pickMenuPlaceholderImage(input: {
  name: string;
  categoryName?: string;
  isCombo?: boolean;
  isDrink?: boolean;
  id?: string;
}): string {
  const hay = normalize(`${input.categoryName ?? ""} ${input.name}`);

  if (input.isCombo || hay.includes("combo")) return MENU_PLACEHOLDER_IMAGES.combo;
  if (input.isDrink || hay.includes("bebida") || hay.includes("refri") || hay.includes("suco")) {
    if (hay.includes("suco") || hay.includes("juice") || hay.includes("natural")) {
      return MENU_PLACEHOLDER_IMAGES.juice;
    }
    return MENU_PLACEHOLDER_IMAGES.soda;
  }
  if (hay.includes("pizza")) return MENU_PLACEHOLDER_IMAGES.pizza;
  if (hay.includes("batata") || hay.includes("frita") || hay.includes("porcao")) {
    return MENU_PLACEHOLDER_IMAGES.fries;
  }
  if (
    hay.includes("burger") ||
    hay.includes("hamburg") ||
    hay.includes("x-") ||
    hay.includes("lanche")
  ) {
    return MENU_PLACEHOLDER_IMAGES.burger;
  }
  if (hay.includes("sobremesa") || hay.includes("brownie") || hay.includes("bolo")) {
    return MENU_PLACEHOLDER_IMAGES.dessert;
  }
  if (hay.includes("salada")) return MENU_PLACEHOLDER_IMAGES.salad;

  return hashPick(input.id ?? input.name, FALLBACK_POOL);
}
