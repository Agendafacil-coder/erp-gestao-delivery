import { sql } from "drizzle-orm";
import { getDb } from "@/db/connection.server";

export async function handleHealthRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/health") return null;

  const hasDb = Boolean(process.env.DATABASE_URL?.trim());
  let dbOk = false;
  let dbError: string | undefined;

  if (hasDb) {
    try {
      const db = getDb();
      await db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch (e) {
      dbError = e instanceof Error ? e.message : String(e);
    }
  }

  const body = {
    ok: !hasDb || dbOk,
    ts: Date.now(),
    postgres: hasDb ? (dbOk ? "up" : "down") : "disabled",
    ...(dbError ? { dbError } : {}),
  };

  return Response.json(body, { status: body.ok ? 200 : 503 });
}
