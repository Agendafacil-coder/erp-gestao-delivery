-- Módulo Salão: mesas, comandas e vínculo de rodadas em orders.tab_id
CREATE TABLE IF NOT EXISTS public.salon_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 4,
  area text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS salon_tables_tenant_name ON public.salon_tables (tenant_id, name);

CREATE TABLE IF NOT EXISTS public.salon_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.salon_tables(id) ON DELETE SET NULL,
  code text NOT NULL,
  customer_name text,
  people_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'aberta',
  service_fee_percent numeric(5,2) NOT NULL DEFAULT 10,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  opened_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS salon_tabs_tenant_status ON public.salon_tabs (tenant_id, status);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tab_id uuid REFERENCES public.salon_tabs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS orders_tab_id ON public.orders (tab_id) WHERE tab_id IS NOT NULL;
