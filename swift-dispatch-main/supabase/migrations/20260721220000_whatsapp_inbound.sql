-- Mensagens WhatsApp recebidas (inbox operacional)
CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone text NOT NULL,
  contact_name text,
  body text NOT NULL,
  provider_message_id text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_inbound_tenant_created
  ON whatsapp_inbound_messages (tenant_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_inbound_provider_unique
  ON whatsapp_inbound_messages (tenant_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
