ALTER TABLE tenant_menu_settings
  ADD COLUMN IF NOT EXISTS menu_layout text NOT NULL DEFAULT 'classic';
