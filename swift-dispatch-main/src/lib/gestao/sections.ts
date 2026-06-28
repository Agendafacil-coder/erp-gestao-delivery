import { canAccessNav, type AppRole, type NavKey } from "@/lib/roles";

export type GestaoSection = "financeiro" | "indicadores" | "relatorios";

const SECTION_NAV: Record<GestaoSection, NavKey> = {
  financeiro: "financeiro",
  indicadores: "analytics",
  relatorios: "relatorios",
};

export const GESTAO_SECTIONS: GestaoSection[] = ["financeiro", "indicadores", "relatorios"];

export function canAccessGestao(role: AppRole | null): boolean {
  if (!role) return false;
  return GESTAO_SECTIONS.some((s) => canAccessNav(role, SECTION_NAV[s]));
}

export function canAccessGestaoSection(role: AppRole | null, section: GestaoSection): boolean {
  if (!role) return false;
  return canAccessNav(role, SECTION_NAV[section]);
}

export function accessibleGestaoSections(role: AppRole | null): GestaoSection[] {
  return GESTAO_SECTIONS.filter((s) => canAccessGestaoSection(role, s));
}

export function parseGestaoSection(value: unknown): GestaoSection {
  if (value === "indicadores" || value === "relatorios") return value;
  return "financeiro";
}

export function defaultGestaoSection(role: AppRole | null): GestaoSection {
  const allowed = accessibleGestaoSections(role);
  return allowed[0] ?? "financeiro";
}
