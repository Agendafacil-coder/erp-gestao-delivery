import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não configurada. Veja .env.example");
  }
  if (!db) {
    const isDev = process.env.NODE_ENV !== "production";
    client = postgres(url, {
      max: isDev ? 3 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 10,
    });
    db = drizzle(client, { schema });
  }
  return db;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}

export { schema };
