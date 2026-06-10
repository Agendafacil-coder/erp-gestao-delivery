ALTER TABLE tenant_menu_settings
  ADD COLUMN IF NOT EXISTS sla_settings text;
