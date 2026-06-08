CREATE TABLE IF NOT EXISTS ifood_tenant_config (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  merchant_id text,
  webhook_secret text,
  access_token text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ifood_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  external_order_id text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ifood_inbound_events_tenant_created_idx
  ON ifood_inbound_events (tenant_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ifood_inbound_events_external_idx
  ON ifood_inbound_events (tenant_id, external_order_id)
  WHERE external_order_id IS NOT NULL;
