ALTER TABLE tenant_menu_settings
  ADD COLUMN IF NOT EXISTS automation_settings text;
