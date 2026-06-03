-- Módulo financeiro básico: despesas, custos, fechamento diário, CMV (futuro)

DO $$ BEGIN
  CREATE TYPE financial_expense_category AS ENUM ('manual', 'fixed', 'variable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE financial_cost_type AS ENUM ('fixed', 'variable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS financial_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  category financial_expense_category NOT NULL DEFAULT 'manual',
  expense_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_cost_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  cost_type financial_cost_type NOT NULL,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_daily_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  closing_date timestamptz NOT NULL,
  revenue numeric(12, 2) NOT NULL DEFAULT 0,
  delivery_fees numeric(12, 2) NOT NULL DEFAULT 0,
  expenses_total numeric(12, 2) NOT NULL DEFAULT 0,
  fixed_costs numeric(12, 2) NOT NULL DEFAULT 0,
  variable_costs numeric(12, 2) NOT NULL DEFAULT 0,
  estimated_profit numeric(12, 2) NOT NULL DEFAULT 0,
  orders_delivered integer NOT NULL DEFAULT 0,
  snapshot text,
  notes text,
  closed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS financial_cmv_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric(12, 2),
  total_cost numeric(12, 2),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_expenses_tenant_date_idx
  ON financial_expenses (tenant_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS financial_daily_closings_tenant_date_idx
  ON financial_daily_closings (tenant_id, closing_date DESC);
