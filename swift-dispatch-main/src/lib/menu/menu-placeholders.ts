/** URLs públicas (Unsplash) para preencher produtos sem foto em dev/demo. */
export const MENU_PLACEHOLDER_IMAGES = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format",
  fries: "https://images.unsplash.com/photo-1573080496219-bb080063c599?w=600&q=80&auto=format",
  combo: "https://images.unsplash.com/photo-1550547660-d9450f1790ea?w=600&q=80&auto=format",
  soda: "https://images.unsplash.com/photo-1581636625402-29b6462dd042?w=600&q=80&auto=format",
  juice: "https://images.unsplash.com/photo-1600275665688-55bbcd6c4fff?w=600&q=80&auto=format",
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
  if (input.isDrink || hay.includes("bebida") || hay.includes("drink")) {
    if (
      hay.includes("suco") ||
      hay.includes("juice") ||
      hay.includes("natural") ||
      hay.includes("laranja") ||
      hay.includes("limao")
    ) {
      return MENU_PLACEHOLDER_IMAGES.juice;
    }
    if (
      hay.includes("refri") ||
      hay.includes("refrigerante") ||
      hay.includes("lata") ||
      hay.includes("coca") ||
      hay.includes("guarana") ||
      hay.includes("cola")
    ) {
      return MENU_PLACEHOLDER_IMAGES.soda;
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
