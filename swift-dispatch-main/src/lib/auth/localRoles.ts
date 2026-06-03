import type { AppRole } from "@/lib/roles";

const DEFAULT_TENANT_ID = "tenant-default-id";

/** Papéis de demonstração no modo LocalStorage (espelha contas do seed PostgreSQL). */
const EMAIL_ROLE_MAP: Record<string, AppRole> = {
  "operador@deliveryos.com.br": "owner",
  "cozinha@deliveryos.com.br": "kitchen",
  "entregador@deliveryos.com.br": "driver",
};

export function inferLocalRoleFromEmail(email: string): AppRole {
  const normalized = email.toLowerCase().trim();
  if (EMAIL_ROLE_MAP[normalized]) return EMAIL_ROLE_MAP[normalized];
  if (normalized.includes("cozinha")) return "kitchen";
  if (normalized.includes("entregador") || normalized.includes("motorista")) return "driver";
  return "owner";
}

export function buildLocalRoleRows(
  email: string,
  tenantId = DEFAULT_TENANT_ID,
): Array<{ tenant_id: string; role: string }> {
  return [{ tenant_id: tenantId, role: inferLocalRoleFromEmail(email) }];
}
