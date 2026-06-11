/**
 * Preenche image_url em produtos do cardápio que estão sem foto (dev/teste).
 * Uso: npm run db:backfill-menu-images
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import * as schema from "../src/db/schema";
import {
  backfillMissingMenuImages,
  refreshDemoMenuPlaceholderImages,
} from "../src/lib/menu/menu-images.server";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8")
      .split("\n")
      .forEach((line) => {
        const parts = line.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
          if (key) process.env[key] = value;
        }
      });
  }
} catch (e) {
  console.warn("Could not load .env file:", e);
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://delivery:delivery@localhost:5432/delivery_os";

async function main() {
  const refresh = process.argv.includes("--refresh");
  const client = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  const tenants = await db.select({ id: schema.tenants.id, name: schema.tenants.name }).from(schema.tenants);
  let total = 0;

  for (const tenant of tenants) {
    const result = refresh
      ? await refreshDemoMenuPlaceholderImages(db, tenant.id)
      : await backfillMissingMenuImages(db, tenant.id);
    if (result.updated === 0) continue;
    console.log(`\n${tenant.name}:`);
    for (const item of result.items) {
      console.log(`✓ ${item.name} → ${item.imageUrl}`);
    }
    total += result.updated;
  }

  if (total === 0) {
    console.log(refresh ? "Nenhuma foto de demo desatualizada." : "Nenhum produto sem foto.");
  } else {
    console.log(`\n${total} produto(s) atualizado(s) com foto de teste.`);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
