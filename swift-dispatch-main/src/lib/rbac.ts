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
    const kitchenTargetOk =
      KITCHEN_STATUSES.includes(toStatus) || toStatus === "aguardando_entregador";
    if (!KITCHEN_STATUSES.includes(fromStatus) || !kitchenTargetOk) {
      throw new Error("Cozinha só pode alterar status de preparo");
    }
    return;
  }

  if (role === "driver") {
    if (!isAssignedDriver) throw new Error("Pedido não atribuído a você");
    if (toStatus === "cancelado") {
      throw new Error("Entregador não pode cancelar pedidos");
    }
    const allowed =
      (fromStatus === "aguardando_entregador" && toStatus === "em_rota_entrega") ||
      (fromStatus === "em_rota_entrega" && toStatus === "entregue");
    if (!allowed) {
      throw new Error("Entregador só pode avançar pedidos atribuídos (retirada → rota → entrega)");
    }
    return;
  }

  throw new Error("Sem permissão para alterar status");
}

export function assertCanAssignDriver(user: SessionUser, tenantId: string): void {
  assertRole(user, tenantId, ["owner", "admin", "manager", "dispatcher"], "Sem permissão para atribuir entregador");
}

export function assertCanAcceptOrderAsDriver(
  user: SessionUser,
  tenantId: string,
  isOwnDriver: boolean,
): void {
  const role = getPrimaryRole(user, tenantId);
  if (!role) throw new Error("Sem permissão");
  if (OPS_ROLES.includes(role)) return;
  if (role === "driver" && isOwnDriver) return;
  throw new Error("Sem permissão para aceitar este pedido");
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

export function assertCanAccessFinance(user: SessionUser, tenantId: string): void {
  assertRole(user, tenantId, ["owner", "admin", "manager"], "Sem permissão para acessar financeiro");
}

export function assertCanBatchDispatch(user: SessionUser, tenantId: string): void {
  assertRole(
    user,
    tenantId,
    ["owner", "admin", "manager", "dispatcher"],
    "Sem permissão para despacho em lote",
  );
}

export function assertCanAccessWhatsapp(user: SessionUser, tenantId: string): void {
  assertRole(
    user,
    tenantId,
    ["owner", "admin", "manager", "dispatcher"],
    "Sem permissão para WhatsApp",
  );
}

/** Snapshot ops completo (PII, tracking tokens) — papéis operacionais apenas */
export function assertCanAccessOpsSnapshot(user: SessionUser, tenantId: string): void {
  assertRole(
    user,
    tenantId,
    ["owner", "admin", "manager", "dispatcher", "cashier"],
    "Sem permissão para visualizar operações",
  );
}

export function assertCanManageDrivers(user: SessionUser, tenantId: string): void {
  assertRole(
    user,
    tenantId,
    ["owner", "admin", "manager", "dispatcher"],
    "Sem permissão para gerenciar entregadores",
  );
}

/** Entregador: só o próprio perfil (online/offline). Demais: dispatcher+. */
export function assertCanUpdateDriverStatus(
  user: SessionUser,
  tenantId: string,
  driverUserId: string | null,
  nextStatus?: string,
): void {
  if (driverUserId === user.id) {
    const role = getPrimaryRole(user, tenantId);
    if (role === "driver" && nextStatus && !["disponivel", "offline"].includes(nextStatus)) {
      throw new Error("Entregador só pode alternar entre disponível e offline");
    }
    return;
  }
  assertCanManageDrivers(user, tenantId);
}

export function assertCanSeedDemo(user: SessionUser, tenantId: string): void {
  assertRole(
    user,
    tenantId,
    ["owner", "admin", "manager", "dispatcher"],
    "Sem permissão para gerar dados demo",
  );
}

export { KITCHEN_ROLES, DRIVER_ROLES, OPS_ROLES };
