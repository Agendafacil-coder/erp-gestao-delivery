import type { MenuLayoutId } from "@/lib/menu/public-settings";

/** Largura máxima do cardápio do cliente — mobile-first, expande em telas maiores */
export const MENU_PAGE_MAX = "max-w-md sm:max-w-xl lg:max-w-2xl";

export type HighlightStyle = "rail" | "strip" | "none";

export type MenuLayoutConfig = {
  id: MenuLayoutId;
  label: string;
  description: string;
  pageMax: string;
  productLayout: "list" | "grid";
  cardVariant: MenuLayoutId;
  heroVariant: "full" | "compact";
  highlightStyle: HighlightStyle;
  categoryGridClass: string;
  categorySectionClass: string;
  mainSpacingClass: string;
  shellClass: string;
};

export const MENU_LAYOUTS: Record<MenuLayoutId, MenuLayoutConfig> = {
  classic: {
    id: "classic",
    label: "Clássico",
    description: "Lista premium com hero e destaques",
    pageMax: MENU_PAGE_MAX,
    productLayout: "list",
    cardVariant: "classic",
    heroVariant: "full",
    highlightStyle: "rail",
    categoryGridClass: "flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4",
    categorySectionClass: "",
    mainSpacingClass: "space-y-8",
    shellClass: "menu-layout--classic",
  },
  gallery: {
    id: "gallery",
    label: "Galeria",
    description: "Grade visual com fotos em destaque",
    pageMax: "max-w-md sm:max-w-xl lg:max-w-3xl",
    productLayout: "grid",
    cardVariant: "gallery",
    heroVariant: "full",
    highlightStyle: "rail",
    categoryGridClass: "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3",
    categorySectionClass: "",
    mainSpacingClass: "space-y-10",
    shellClass: "menu-layout--gallery",
  },
  clean: {
    id: "clean",
    label: "Limpo",
    description: "Claro, direto e fácil de navegar",
    pageMax: MENU_PAGE_MAX,
    productLayout: "list",
    cardVariant: "clean",
    heroVariant: "compact",
    highlightStyle: "strip",
    categoryGridClass: "flex flex-col",
    categorySectionClass: "menu-category-section--clean",
    mainSpacingClass: "space-y-5",
    shellClass: "menu-layout--clean",
  },
};

export function getMenuLayoutConfig(layoutId: MenuLayoutId | string | null | undefined): MenuLayoutConfig {
  if (layoutId && layoutId in MENU_LAYOUTS) {
    return MENU_LAYOUTS[layoutId as MenuLayoutId];
  }
  return MENU_LAYOUTS.classic;
}
