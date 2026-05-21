/**
 * Permissões e rotas do ERP — chaves internas (NavKey) e paths (/central, /kanban…).
 * NÃO renomear para “nomes amigáveis”: isso quebra RBAC e links.
 * Textos do menu lateral ficam só em lib/i18n/translations.ts (namespace `nav`).
 */
export type AppRole =
  | "owner"
  | "admin"
  | "dispatcher"
  | "manager"
  | "kitchen"
  | "cashier"
  | "driver"
  | "viewer";

export type NavKey =
  | "central"
  | "kanban"
  | "mapa"
  | "kds"
  | "tracking"
  | "entregador"
  | "whatsapp"
  | "analytics"
  | "financeiro"
  | "automacoes"
  | "auditoria"
  | "configs"
  | "cardapio";

/** Prefixo de rota autenticada → chave de navegação */
export const ROUTE_NAV: Record<string, NavKey> = {
  "/central": "central",
  "/kanban": "kanban",
  "/mapa": "mapa",
  "/kds": "kds",
  "/tracking": "tracking",
  "/entregador": "entregador",
  "/whatsapp": "whatsapp",
  "/analytics": "analytics",
  "/financeiro": "financeiro",
  "/automacoes": "automacoes",
  "/auditoria": "auditoria",
  "/configs": "configs",
  "/cardapio": "cardapio",
};

const ROLE_NAV: Record<AppRole, NavKey[]> = {
  owner: [
    "central",
    "kanban",
    "mapa",
    "kds",
    "tracking",
    "entregador",
    "whatsapp",
    "analytics",
    "financeiro",
    "automacoes",
    "auditoria",
    "configs",
    "cardapio",
  ],
  admin: [
    "central",
    "kanban",
    "mapa",
    "kds",
    "tracking",
    "entregador",
    "whatsapp",
    "analytics",
    "financeiro",
    "automacoes",
    "auditoria",
    "configs",
    "cardapio",
  ],
  manager: [
    "central",
    "kanban",
    "mapa",
    "kds",
    "tracking",
    "whatsapp",
    "analytics",
    "financeiro",
    "cardapio",
    "configs",
  ],
  dispatcher: ["central", "kanban", "mapa", "kds", "tracking", "entregador", "whatsapp"],
  kitchen: ["kds"],
  cashier: ["central", "kanban", "kds", "tracking"],
  driver: ["entregador"],
  viewer: ["central", "kanban", "analytics", "tracking"],
};

export function canAccessNav(role: AppRole | null, key: NavKey): boolean {
  if (!role) return false;
  return ROLE_NAV[role]?.includes(key) ?? false;
}

export function pathnameToNavKey(pathname: string): NavKey | null {
  const sorted = Object.entries(ROUTE_NAV).sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, key] of sorted) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return key;
  }
  return null;
}

export function canAccessRoute(role: AppRole | null, pathname: string): boolean {
  const key = pathnameToNavKey(pathname);
  if (!key) return true;
  return canAccessNav(role, key);
}

export function rolesForTenant(
  roleRows: Array<{ tenant_id: string; role: string }>,
  tenantId: string,
): AppRole[] {
  return roleRows
    .filter((r) => r.tenant_id === tenantId)
    .map((r) => r.role as AppRole);
}

export function defaultRouteForRole(role: AppRole | null): string {
  switch (role) {
    case "kitchen":
      return "/kds";
    case "driver":
      return "/entregador";
    case "viewer":
      return "/analytics";
    default:
      return "/central";
  }
}

export function pickPrimaryRole(roles: string[]): AppRole | null {
  const priority: AppRole[] = [
    "owner",
    "admin",
    "manager",
    "dispatcher",
    "kitchen",
    "cashier",
    "driver",
    "viewer",
  ];
  for (const r of priority) {
    if (roles.includes(r)) return r;
  }
  return null;
}
