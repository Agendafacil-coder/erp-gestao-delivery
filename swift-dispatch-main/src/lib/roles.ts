/**
 * Permissões e rotas do ERP — chaves internas (NavKey) e paths (/central, /kanban…).
 * NÃO renomear para “nomes amigáveis”: isso quebra RBAC e links.
 * Textos do menu lateral ficam só em lib/i18n/translations.ts (namespace `nav`).
 */

/** Perfis de negócio expostos na UI (ADM, Cozinha, Entregador). */
export type AppProfile = "admin" | "kitchen" | "driver";

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
  | "kds"
  | "tracking"
  | "entregador"
  | "whatsapp"
  | "analytics"
  | "relatorios"
  | "financeiro"
  | "automacoes"
  | "auditoria"
  | "configs"
  | "sistema"
  | "cardapio";

/** Prefixo de rota autenticada → chave de navegação */
export const ROUTE_NAV: Record<string, NavKey> = {
  "/central": "central",
  "/kanban": "kanban",
  "/mapa": "tracking",
  "/kds": "kds",
  "/tracking": "tracking",
  "/entregador": "entregador",
  "/whatsapp": "whatsapp",
  "/analytics": "analytics",
  "/relatorios": "relatorios",
  "/financeiro": "financeiro",
  "/automacoes": "automacoes",
  "/auditoria": "auditoria",
  "/configs": "configs",
  "/sistema": "sistema",
  "/cardapio": "cardapio",
};

const ROLE_NAV: Record<AppRole, NavKey[]> = {
  owner: [
    "central",
    "kanban",
    "kds",
    "tracking",
    "entregador",
    "whatsapp",
    "analytics",
    "relatorios",
    "financeiro",
    "automacoes",
    "auditoria",
    "configs",
    "sistema",
    "cardapio",
  ],
  admin: [
    "central",
    "kanban",
    "kds",
    "tracking",
    "entregador",
    "whatsapp",
    "analytics",
    "relatorios",
    "financeiro",
    "automacoes",
    "auditoria",
    "configs",
    "sistema",
    "cardapio",
  ],
  manager: [
    "central",
    "kanban",
    "kds",
    "tracking",
    "whatsapp",
    "analytics",
    "relatorios",
    "financeiro",
    "cardapio",
    "configs",
    "sistema",
  ],
  dispatcher: ["central", "kanban", "kds", "tracking", "whatsapp", "sistema"],
  kitchen: ["kds"],
  cashier: ["central", "kanban", "kds", "tracking"],
  driver: ["entregador"],
  viewer: ["central", "kanban", "analytics", "relatorios", "tracking"],
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
  if (pathname === "/financeiro" || pathname.startsWith("/financeiro/")) {
    return (
      canAccessNav(role, "financeiro") ||
      canAccessNav(role, "analytics") ||
      canAccessNav(role, "relatorios")
    );
  }
  if (pathname === "/sistema" || pathname.startsWith("/sistema/")) {
    return canAccessNav(role, "sistema");
  }
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
      return "/financeiro?secao=indicadores";
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

const ADMIN_ROLES: AppRole[] = [
  "owner",
  "admin",
  "manager",
  "dispatcher",
  "cashier",
  "viewer",
];

/** Mapeia papel técnico → perfil de produto (ADM / Cozinha / Entregador). */
export function roleToProfile(role: AppRole | null): AppProfile | null {
  if (!role) return null;
  if (role === "kitchen") return "kitchen";
  if (role === "driver") return "driver";
  if (ADMIN_ROLES.includes(role)) return "admin";
  return "admin";
}

/** Papéis do usuário no tenant atual */
export function rolesForAccess(
  roleRows: Array<{ tenant_id: string; role: string }>,
  tenantId: string | null,
): AppRole[] {
  if (!tenantId) return [];
  return rolesForTenant(roleRows, tenantId);
}

/**
 * Perfil de UI conforme a rota — quem tem cozinha/entregador vê layout focado na tela certa.
 */
export function resolveProfileForPath(
  roles: AppRole[],
  pathname: string,
): AppProfile | null {
  if (!roles.length) return null;
  const navKey = pathnameToNavKey(pathname);
  if (navKey === "kds" && roles.includes("kitchen")) return "kitchen";
  if (navKey === "entregador" && roles.includes("driver")) return "driver";
  return roleToProfile(pickPrimaryRole(roles));
}

export function isRestrictedProfile(profile: AppProfile | null): boolean {
  return profile === "kitchen" || profile === "driver";
}

export const PROFILE_HOME: Record<AppProfile, string> = {
  admin: "/central",
  kitchen: "/kds",
  driver: "/entregador",
};

export const PROFILE_LABELS: Record<AppProfile, string> = {
  admin: "Administrador",
  kitchen: "Cozinha",
  driver: "Entregador",
};

export function profileHomeRoute(profile: AppProfile | null): string {
  if (!profile) return "/central";
  return PROFILE_HOME[profile];
}

const OPS_MUTATE_ROLES: AppRole[] = ["owner", "admin", "manager", "dispatcher", "cashier"];
const BATCH_DISPATCH_ROLES: AppRole[] = ["owner", "admin", "manager", "dispatcher"];

/** Pode alterar pedidos na Central (scan, status, pedido manual). */
export function canMutateOps(role: AppRole | null): boolean {
  return role != null && OPS_MUTATE_ROLES.includes(role);
}

/** Pode ligar/desligar despacho automático e despacho em lote. */
export function canBatchDispatch(role: AppRole | null): boolean {
  return role != null && BATCH_DISPATCH_ROLES.includes(role);
}
