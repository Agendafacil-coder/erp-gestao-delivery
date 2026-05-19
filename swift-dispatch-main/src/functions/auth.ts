import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, schema } from "@/db";
import { createSession, destroySession, getSessionUser, type SessionUser } from "./session";

export const getSessionFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => getSessionUser(),
);

export const signInFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string }) => data)
  .handler(async ({ data }): Promise<SessionUser> => {
    const db = getDb();
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email.toLowerCase().trim()))
      .limit(1);

    if (!user) throw new Error("Email ou senha inválidos");

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new Error("Email ou senha inválidos");

    await createSession(user.id);
    const session = await getSessionUser();
    if (!session) throw new Error("Falha ao criar sessão");
    return session;
  });

export const signUpFn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; password: string; name: string }) => data)
  .handler(async ({ data }): Promise<SessionUser> => {
    const db = getDb();
    const email = data.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(data.password, 10);

    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (existing) throw new Error("Email já cadastrado");

    const [user] = await db
      .insert(schema.users)
      .values({
        email,
        passwordHash,
        fullName: data.name.trim(),
      })
      .returning();

    await db.insert(schema.profiles).values({
      id: user.id,
      fullName: data.name.trim(),
    });

    await createSession(user.id);
    const session = await getSessionUser();
    if (!session) throw new Error("Falha ao criar sessão");
    return session;
  });

export const signOutFn = createServerFn({ method: "POST" }).handler(async () => {
  await destroySession();
  return { ok: true };
});
