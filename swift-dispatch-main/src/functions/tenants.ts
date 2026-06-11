import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";
import type { LocalTenant } from "@/lib/db/localDb";
import { mapTenant } from "./mappers";
import { requireSessionUser } from "./session";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export const listTenantsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<LocalTenant[]> => {
    const user = await requireSessionUser();
    const db = getDb();

    const rows = await db
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        plan: schema.tenants.plan,
      })
      .from(schema.tenants)
      .innerJoin(schema.userRoles, eq(schema.userRoles.tenantId, schema.tenants.id))
      .where(eq(schema.userRoles.userId, user.id));

    return rows.map(mapTenant);
  },
);

export const getCurrentTenantFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<LocalTenant | null> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [profile] = await db
      .select({ currentTenantId: schema.profiles.currentTenantId })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, user.id))
      .limit(1);

    if (!profile?.currentTenantId) {
      const [first] = await db
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          plan: schema.tenants.plan,
        })
        .from(schema.tenants)
        .innerJoin(schema.userRoles, eq(schema.userRoles.tenantId, schema.tenants.id))
        .where(eq(schema.userRoles.userId, user.id))
        .limit(1);
      return first ? mapTenant(first) : null;
    }

    const [tenant] = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, profile.currentTenantId))
      .limit(1);

    return tenant ? mapTenant(tenant) : null;
  },
);

export const switchTenantFn = createServerFn({ method: "POST" })
  .inputValidator((data: { tenantId: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [role] = await db
      .select({ id: schema.userRoles.id })
      .from(schema.userRoles)
      .where(
        and(eq(schema.userRoles.userId, user.id), eq(schema.userRoles.tenantId, data.tenantId)),
      )
      .limit(1);

    if (!role) throw new Error("Sem acesso ao tenant");

    await db
      .update(schema.profiles)
      .set({ currentTenantId: data.tenantId, updatedAt: new Date() })
      .where(eq(schema.profiles.id, user.id));
  });

export const createTenantFn = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => data)
  .handler(async ({ data }): Promise<string> => {
    const user = await requireSessionUser();
    const db = getDb();

    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: data.name.trim(),
        slug: slugify(data.name),
        plan: "trial",
      })
      .returning();

    await db.insert(schema.userRoles).values({
      userId: user.id,
      tenantId: tenant.id,
      role: "owner",
    });

    await db
      .update(schema.profiles)
      .set({ currentTenantId: tenant.id, updatedAt: new Date() })
      .where(eq(schema.profiles.id, user.id));

    return tenant.id;
  });
