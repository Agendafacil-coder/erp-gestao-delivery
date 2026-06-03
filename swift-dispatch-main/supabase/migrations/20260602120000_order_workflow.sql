-- Fluxo de pedidos: status confirmado + campos financeiros
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'confirmado' BEFORE 'em_preparo';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

UPDATE public.orders SET subtotal_amount = total_amount WHERE subtotal_amount IS NULL;

UPDATE public.orders SET status = 'aguardando_entregador' WHERE status = 'em_rota_coleta';
UPDATE public.orders SET status = 'em_rota_entrega' WHERE status = 'retirado';
