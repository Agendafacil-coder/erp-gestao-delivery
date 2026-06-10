CREATE TABLE IF NOT EXISTS whatsapp_tenant_config (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'evolution',
  api_url text,
  api_key text,
  instance_name text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
