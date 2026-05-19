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
  | "configs";

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
  ],
  manager: ["central", "kanban", "mapa", "kds", "tracking", "whatsapp", "analytics", "financeiro"],
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
