ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz;
