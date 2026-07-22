-- Mapeamento item local → item iFood (para pausar/ativar no catálogo)
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS ifood_item_id text;

-- Interrupção ativa da loja no iFood (pausa omnichannel)
ALTER TABLE ifood_tenant_config
  ADD COLUMN IF NOT EXISTS pause_interruption_id text;
