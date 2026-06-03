-- Custo unitário do produto (CMV / margem)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS unit_cost numeric(12, 2);
