import { createHash, randomBytes } from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import { getDb } from "@/db/connection.server";
import { schema } from "@/db";

const SESSION_COOKIE = "delivery_session";
const SESSION_DAYS = 30;

export function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function parseCookieHeader(header: string | null): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

function isMissingStartContextError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("StartEvent") || msg.includes("AsyncLocalStorage");
}

/** Lê o cookie de sessão no contexto TanStack Start ou via Request (API routes). */
function readSessionCookie(): string | undefined {
  try {
    const value = getCookie(SESSION_COOKIE);
    if (value) return value;
  } catch (err) {
    if (!isMissingStartContextError(err)) throw err;
  }

  try {
    const request = getRequest();
    if (request) {
      return parseCookieHeader(request.headers.get("Cookie"))[SESSION_COOKIE];
    }
  } catch {
    // getRequest indisponível fora do runtime Start
  }

  return undefined;
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
  const raw = readSessionCookie();
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

async function loadSessionUser(raw: string | undefined): Promise<SessionUser | null> {
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

/** Para rotas /api/* registradas em server.ts (fora do RPC do TanStack Start). */
export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const raw = parseCookieHeader(request.headers.get("Cookie"))[SESSION_COOKIE];
  return loadSessionUser(raw);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    return await loadSessionUser(readSessionCookie());
  } catch (e) {
    console.error("getSessionUser:", e);
    return null;
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Não autenticado");
  return user;
}
