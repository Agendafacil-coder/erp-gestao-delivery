import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type Sql = import("postgres").Sql;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const require = createRequire(fileURLToPath(import.meta.url));

let client: Sql | null = null;
let db: Db | null = null;

function createPostgresClient(url: string): Sql {
  const postgres = require("postgres") as typeof import("postgres").default;
  const isDev = process.env.NODE_ENV !== "production";
  return postgres(url, {
    max: isDev ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 10,
  });
}

export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não configurada. Veja .env.example");
  }
  if (!db) {
    client = createPostgresClient(url);
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

export type { Db };
