/**
 * Aplica migration do cardápio público sem prompt interativo.
 * Uso: npx tsx scripts/apply-menu-migration.ts
 */
import postgres from "postgres";
import fs from "fs";
import path from "path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8")
      .split("\n")
      .forEach((line) => {
        const i = line.indexOf("=");
        if (i > 0) {
          const key = line.slice(0, i).trim();
          const value = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
          if (key) process.env[key] = value;
        }
      });
  }
} catch {
  /* ignore */
}

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://delivery:delivery@localhost:5432/delivery_os";

const MENU_MIGRATIONS = [
  "20260603120000_public_menu_enhancements.sql",
  "20260603150000_menu_item_unit_cost.sql",
];

async function main() {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const client = postgres(DATABASE_URL, { max: 1 });
  for (const file of MENU_MIGRATIONS) {
    const sqlPath = path.join(migrationsDir, file);
    await client.unsafe(fs.readFileSync(sqlPath, "utf-8"));
    console.log("✓ Migration aplicada:", file);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
