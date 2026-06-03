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

async function main() {
  const sqlPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20260603120000_public_menu_enhancements.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf-8");
  const client = postgres(DATABASE_URL, { max: 1 });
  await client.unsafe(sql);
  await client.end();
  console.log("✓ Migration aplicada:", sqlPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
