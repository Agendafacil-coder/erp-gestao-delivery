import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import { assertCanManageTeam } from "@/lib/rbac";
import type { AppRole } from "@/lib/roles";
import { requireSessionUser } from "./session";

async function assertTenantAccess(userId: string, tenantId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: schema.userRoles.id })
    .from(schema.userRoles)
    .where(and(eq(schema.userRoles.userId, userId), eq(schema.userRoles.tenantId, tenantId)))
    .limit(1);
  if (!row) throw new Error("Sem permissão para este tenant");
}

export type TeamMember = {
  user_id: string;
  email: string;
  full_name: string;
  roles: AppRole[];
};

export const listTeamFn = createServerFn({ method: "GET" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<TeamMember[]> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageTeam(user, data.tenantId);

    const db = getDb();
    const rows = await db
      .select({
        userId: schema.userRoles.userId,
        role: schema.userRoles.role,
        email: schema.users.email,
        fullName: schema.users.fullName,
      })
      .from(schema.userRoles)
      .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
      .where(eq(schema.userRoles.tenantId, data.tenantId));

    const byUser = new Map<string, TeamMember>();
    for (const row of rows) {
      const existing = byUser.get(row.userId);
      if (existing) {
        existing.roles.push(row.role as AppRole);
      } else {
        byUser.set(row.userId, {
          user_id: row.userId,
          email: row.email,
          full_name: row.fullName,
          roles: [row.role as AppRole],
        });
      }
    }
    return Array.from(byUser.values());
  });

export const assignTeamRoleFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; email: string; role: AppRole }) => data,
  )
  .handler(async ({ data }): Promise<TeamMember> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageTeam(user, data.tenantId);

    const db = getDb();
    const email = data.email.toLowerCase().trim();

    const [target] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!target) {
      throw new Error("Usuário não encontrado. A pessoa precisa criar conta antes.");
    }

    const [existing] = await db
      .select({ id: schema.userRoles.id })
      .from(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, target.id),
          eq(schema.userRoles.tenantId, data.tenantId),
          eq(schema.userRoles.role, data.role),
        ),
      )
      .limit(1);

    if (!existing) {
      await db.insert(schema.userRoles).values({
        userId: target.id,
        tenantId: data.tenantId,
        role: data.role,
      });
    }

    const roles = await db
      .select({ role: schema.userRoles.role })
      .from(schema.userRoles)
      .where(
        and(eq(schema.userRoles.userId, target.id), eq(schema.userRoles.tenantId, data.tenantId)),
      );

    return {
      user_id: target.id,
      email: target.email,
      full_name: target.fullName,
      roles: roles.map((r) => r.role as AppRole),
    };
  });

export const removeTeamRoleFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { tenantId: string; userId: string; role: AppRole }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const user = await requireSessionUser();
    await assertTenantAccess(user.id, data.tenantId);
    assertCanManageTeam(user, data.tenantId);

    if (data.userId === user.id && data.role === "owner") {
      throw new Error("Não é possível remover o próprio papel de dono");
    }

    const db = getDb();
    await db
      .delete(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, data.userId),
          eq(schema.userRoles.tenantId, data.tenantId),
          eq(schema.userRoles.role, data.role),
        ),
      );

    return { ok: true };
  });
