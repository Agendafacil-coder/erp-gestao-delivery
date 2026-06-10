-- Estoque básico por produto do cardápio
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS stock_quantity integer,
  ADD COLUMN IF NOT EXISTS stock_min integer NOT NULL DEFAULT 0;
