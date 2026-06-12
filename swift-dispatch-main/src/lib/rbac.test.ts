import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertCanAccessAudit,
  assertCanCreateOperationalAlert,
  assertCanManageIntegrations,
} from "./rbac";
import type { SessionUser } from "@/functions/session";

function userWithRole(role: string, tenantId = "tenant-1"): SessionUser {
  return {
    id: "user-1",
    email: "test@example.com",
    roles: [{ tenant_id: tenantId, role }],
  };
}

describe("rbac helpers", () => {
  it("auditoria: owner ok, kitchen negado", () => {
    assert.doesNotThrow(() => assertCanAccessAudit(userWithRole("owner"), "tenant-1"));
    assert.throws(() => assertCanAccessAudit(userWithRole("kitchen"), "tenant-1"), /auditoria/);
  });

  it("integrações: admin ok, dispatcher negado", () => {
    assert.doesNotThrow(() => assertCanManageIntegrations(userWithRole("admin"), "tenant-1"));
    assert.throws(() => assertCanManageIntegrations(userWithRole("dispatcher"), "tenant-1"), /integrações/);
  });

  it("alerta operacional: cozinha ok, viewer negado", () => {
    assert.doesNotThrow(() => assertCanCreateOperationalAlert(userWithRole("kitchen"), "tenant-1"));
    assert.throws(
      () => assertCanCreateOperationalAlert(userWithRole("viewer"), "tenant-1"),
      /alerta/,
    );
  });
});
