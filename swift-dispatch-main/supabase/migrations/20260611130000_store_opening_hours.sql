-- Horário de funcionamento da loja (JSON) para status aberto/fechado no cardápio
ALTER TABLE tenant_menu_settings
  ADD COLUMN IF NOT EXISTS opening_hours text;
