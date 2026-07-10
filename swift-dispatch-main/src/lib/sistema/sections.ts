import { canAccessNav, type AppRole, type NavKey } from "@/lib/roles";

export type SistemaSection = "whatsapp" | "automacoes" | "auditoria" | "configs";

const SECTION_NAV: Record<SistemaSection, NavKey> = {
  whatsapp: "whatsapp",
  automacoes: "automacoes",
  auditoria: "auditoria",
  configs: "configs",
};

/** Ordem de exibição e preferência de entrada (loja primeiro). */
export const SISTEMA_SECTIONS: SistemaSection[] = [
  "configs",
  "whatsapp",
  "automacoes",
  "auditoria",
];

export function canAccessSistema(role: AppRole | null): boolean {
  if (!role) return false;
  return SISTEMA_SECTIONS.some((s) => canAccessNav(role, SECTION_NAV[s]));
}

export function canAccessSistemaSection(
  role: AppRole | null,
  section: SistemaSection,
): boolean {
  if (!role) return false;
  return canAccessNav(role, SECTION_NAV[section]);
}

export function accessibleSistemaSections(role: AppRole | null): SistemaSection[] {
  return SISTEMA_SECTIONS.filter((s) => canAccessSistemaSection(role, s));
}

export function parseSistemaSection(value: unknown): SistemaSection {
  if (
    value === "whatsapp" ||
    value === "automacoes" ||
    value === "auditoria" ||
    value === "configs"
  ) {
    return value;
  }
  return "configs";
}

export function defaultSistemaSection(role: AppRole | null): SistemaSection {
  const allowed = accessibleSistemaSections(role);
  return allowed[0] ?? "configs";
}

/** Mapeia rota legada → seção do hub */
export function legacyPathToSistemaSection(pathname: string): SistemaSection | null {
  if (pathname === "/whatsapp" || pathname.startsWith("/whatsapp/")) return "whatsapp";
  if (pathname === "/automacoes" || pathname.startsWith("/automacoes/")) return "automacoes";
  if (pathname === "/auditoria" || pathname.startsWith("/auditoria/")) return "auditoria";
  if (pathname === "/configs" || pathname.startsWith("/configs/")) return "configs";
  return null;
}
