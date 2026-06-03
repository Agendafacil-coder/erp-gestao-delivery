import type { OrderStatus } from "@/lib/ops/orderWorkflow";
import { KITCHEN_STATUSES, DRIVER_STATUSES } from "@/lib/ops/orderWorkflow";
import {
  pickPrimaryRole,
  rolesForTenant,
  type AppRole,
} from "@/lib/roles";
import type { SessionUser } from "@/functions/session";

const OPS_ROLES: AppRole[] = ["owner", "admin", "manager", "dispatcher", "cashier"];
const KITCHEN_ROLES: AppRole[] = ["kitchen", ...OPS_ROLES];
const DRIVER_ROLES: AppRole[] = ["driver", "dispatcher", ...OPS_ROLES];

export function getPrimaryRole(user: SessionUser, tenantId: string): AppRole | null {
  return pickPrimaryRole(rolesForTenant(user.roles, tenantId));
}

export function assertRole(
  user: SessionUser,
  tenantId: string,
  allowed: AppRole[],
  message = "Sem permissão para esta ação",
): AppRole {
  const role = getPrimaryRole(user, tenantId);
  if (!role || !allowed.includes(role)) throw new Error(message);
  return role;
}

export function assertCanUpdateOrderStatus(
  user: SessionUser,
  tenantId: string,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  isAssignedDriver: boolean,
): void {
  const role = getPrimaryRole(user, tenantId);
  if (!role) throw new Error("Sem permissão");

  if (OPS_ROLES.includes(role)) return;

  if (role === "kitchen") {
    if (!KITCHEN_STATUSES.includes(fromStatus) || !KITCHEN_STATUSES.includes(toStatus)) {
      throw new Error("Cozinha só pode alterar status de preparo");
    }
    return;
  }

  if (role === "driver") {
    if (!isAssignedDriver) throw new Error("Pedido não atribuído a você");
    if (!DRIVER_STATUSES.includes(fromStatus) && !DRIVER_STATUSES.includes(toStatus)) {
      throw new Error("Entregador só pode atualizar pedidos em rota");
    }
    return;
  }

  throw new Error("Sem permissão para alterar status");
}

export function assertCanAssignDriver(user: SessionUser, tenantId: string): void {
  assertRole(user, tenantId, ["owner", "admin", "manager", "dispatcher"], "Sem permissão para atribuir entregador");
}

export function assertCanCreateOrder(user: SessionUser, tenantId: string): void {
  assertRole(
    user,
    tenantId,
    ["owner", "admin", "manager", "dispatcher", "cashier"],
    "Sem permissão para criar pedidos",
  );
}

export function assertCanManageTeam(user: SessionUser, tenantId: string): void {
  assertRole(user, tenantId, ["owner", "admin", "manager"], "Sem permissão para gerenciar equipe");
}

export function assertCanManageMenu(user: SessionUser, tenantId: string): void {
  assertRole(user, tenantId, ["owner", "admin", "manager"], "Sem permissão para gerenciar cardápio");
}

export { KITCHEN_ROLES, DRIVER_ROLES, OPS_ROLES };
