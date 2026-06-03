import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { asc, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8")
    .split("\n")
    .forEach((line) => {
      const i = line.indexOf("=");
      if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    });
}

const tenantId = process.argv[2] ?? "0c20fcd2-ebbe-43ac-91df-24835b31bf90";
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(client, { schema });

try {
  const items = await db
    .select()
    .from(schema.menuItems)
    .where(eq(schema.menuItems.tenantId, tenantId))
    .orderBy(asc(schema.menuItems.sortOrder));
  console.log("OK", items.length, "items");
} catch (e) {
  console.error("FAIL", e);
}
await client.end();
