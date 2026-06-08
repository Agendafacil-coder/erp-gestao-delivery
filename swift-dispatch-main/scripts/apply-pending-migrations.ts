/**
 * Aplica migrations SQL pendentes sem prompt interativo.
 * Uso: npm run db:migrate
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

const MIGRATIONS = [
  "20260602120000_order_workflow.sql",
  "20260603120000_public_menu_enhancements.sql",
  "20260603140000_financial_module.sql",
  "20260603150000_menu_item_unit_cost.sql",
  "20260608120000_driver_locations.sql",
];

/** Colunas/enums do schema Drizzle ainda não cobertos pelos SQL acima */
const SCHEMA_PATCH = `
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pendente', 'pago', 'falhou', 'reembolsado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS source_session_id text;

ALTER TABLE order_line_items
  ADD COLUMN IF NOT EXISTS menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL;
`;

async function main() {
  const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
  const client = postgres(DATABASE_URL, { max: 1 });

  for (const file of MIGRATIONS) {
    const sqlPath = path.join(migrationsDir, file);
    if (!fs.existsSync(sqlPath)) {
      console.warn("⚠ Migration não encontrada:", file);
      continue;
    }
    await client.unsafe(fs.readFileSync(sqlPath, "utf-8"));
    console.log("✓", file);
  }

  await client.unsafe(SCHEMA_PATCH);
  console.log("✓ schema patch (payment_status, tracking_token, …)");

  await client.end();
  console.log("\nMigrations aplicadas com sucesso.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
