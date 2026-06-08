CREATE TABLE IF NOT EXISTS whatsapp_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  recipient_type text NOT NULL DEFAULT 'cliente',
  recipient_phone text,
  recipient_label text NOT NULL,
  template_key text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'demo',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_message_logs_tenant_created_idx
  ON whatsapp_message_logs (tenant_id, created_at DESC);
