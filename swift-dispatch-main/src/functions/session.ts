import { createHash, randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { getDb, schema } from "@/db";

const SESSION_COOKIE = "delivery_session";
const SESSION_DAYS = 30;

export function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const token = createSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);

  await db.insert(schema.sessions).values({
    userId,
    token: hashToken(token),
    expiresAt,
  });

  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const raw = getCookie(SESSION_COOKIE);
  if (raw) {
    const db = getDb();
    await db.delete(schema.sessions).where(eq(schema.sessions.token, hashToken(raw)));
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  roles: Array<{ tenant_id: string; role: string }>;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const raw = getCookie(SESSION_COOKIE);
  if (!raw) return null;

  const db = getDb();
  const now = new Date();

  const [row] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.token, hashToken(raw)), gt(schema.sessions.expiresAt, now)))
    .limit(1);

  if (!row) return null;

  const roles = await db
    .select({
      tenant_id: schema.userRoles.tenantId,
      role: schema.userRoles.role,
    })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, row.id));

  return {
    id: row.id,
    email: row.email,
    full_name: row.fullName,
    roles: roles.map((r) => ({ tenant_id: r.tenant_id, role: r.role })),
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Não autenticado");
  return user;
}
