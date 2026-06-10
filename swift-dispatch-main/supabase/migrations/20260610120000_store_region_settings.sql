ALTER TABLE tenant_menu_settings
  ADD COLUMN IF NOT EXISTS store_city text,
  ADD COLUMN IF NOT EXISTS store_state text,
  ADD COLUMN IF NOT EXISTS store_postal_code text;
