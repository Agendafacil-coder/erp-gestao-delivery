ALTER TABLE tenant_menu_settings
  ADD COLUMN IF NOT EXISTS menu_logo_url text,
  ADD COLUMN IF NOT EXISTS menu_cover_url text;
