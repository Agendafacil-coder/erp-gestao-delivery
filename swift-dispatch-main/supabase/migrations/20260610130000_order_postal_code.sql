ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS postal_code text;
