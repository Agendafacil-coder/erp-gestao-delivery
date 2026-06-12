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
  "20260608180000_whatsapp_message_logs.sql",
  "20260608200000_whatsapp_templates.sql",
  "20260608210000_ifood_integration.sql",
  "20260608220000_ifood_oauth.sql",
  "20260608230000_ifood_polling.sql",
  "20260608240000_ifood_events_index_fix.sql",
  "20260608250000_ifood_merchant_unique.sql",
  "20260610120000_store_region_settings.sql",
  "20260610130000_order_postal_code.sql",
  "20260610140000_auto_dispatch_setting.sql",
  "20260610150000_push_subscriptions.sql",
  "20260610160000_whatsapp_tenant_config.sql",
  "20260610170000_sla_settings.sql",
  "20260610180000_menu_stock.sql",
  "20260610190000_order_arrived_at.sql",
  "20260610200000_whatsapp_order_template_unique.sql",
  "20260610210000_automation_events.sql",
  "20260610220000_automation_settings.sql",
  "20260610230000_menu_branding.sql",
  "20260611120000_menu_layout.sql",
  "20260611130000_store_opening_hours.sql",
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

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS pix_copy_paste text,
  ADD COLUMN IF NOT EXISTS pix_qr_base64 text,
  ADD COLUMN IF NOT EXISTS checkout_url text;

ALTER TABLE tenant_menu_settings
  ADD COLUMN IF NOT EXISTS store_city text,
  ADD COLUMN IF NOT EXISTS store_state text,
  ADD COLUMN IF NOT EXISTS store_postal_code text,
  ADD COLUMN IF NOT EXISTS auto_dispatch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_settings text,
  ADD COLUMN IF NOT EXISTS automation_settings text,
  ADD COLUMN IF NOT EXISTS menu_logo_url text,
  ADD COLUMN IF NOT EXISTS menu_cover_url text,
  ADD COLUMN IF NOT EXISTS menu_layout text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS opening_hours text;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS stock_quantity integer,
  ADD COLUMN IF NOT EXISTS stock_min integer NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS loyalty_points_redeemed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_points_earned integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS loyalty_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_wallets_tenant_phone ON loyalty_wallets (tenant_id, phone);

CREATE TABLE IF NOT EXISTS order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  score integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS abandoned_cart_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_slug text NOT NULL,
  phone text NOT NULL,
  customer_name text,
  cart_json text NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  reminded_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS abandoned_cart_tenant_phone ON abandoned_cart_leads (tenant_id, phone);
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
