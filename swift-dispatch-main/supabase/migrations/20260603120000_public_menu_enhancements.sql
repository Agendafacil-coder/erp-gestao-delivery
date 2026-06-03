-- Cardápio público: variações, adicionais, configurações e pedido

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_combo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_drink boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.menu_item_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_item_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  group_name text DEFAULT 'Adicionais',
  required boolean NOT NULL DEFAULT false,
  max_quantity integer NOT NULL DEFAULT 1,
  is_suggested boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_menu_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  min_order_amount numeric(12,2) DEFAULT 0,
  pickup_enabled boolean NOT NULL DEFAULT true,
  delivery_enabled boolean NOT NULL DEFAULT true,
  default_delivery_fee numeric(12,2) DEFAULT 0,
  neighborhood_fees text,
  coupons text,
  store_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_type text DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS neighborhood text;
