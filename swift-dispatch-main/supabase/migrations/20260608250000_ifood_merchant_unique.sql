CREATE UNIQUE INDEX IF NOT EXISTS ifood_tenant_config_merchant_id_idx
  ON ifood_tenant_config (merchant_id)
  WHERE merchant_id IS NOT NULL AND merchant_id <> '';
