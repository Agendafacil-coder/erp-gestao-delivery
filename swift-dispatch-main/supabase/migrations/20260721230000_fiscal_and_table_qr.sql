-- Documentos fiscais (NFC-e / NF-e) — base para emissão futura
CREATE TABLE IF NOT EXISTS fiscal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  doc_type text NOT NULL DEFAULT 'nfce',
  status text NOT NULL DEFAULT 'draft',
  access_key text,
  number text,
  series text,
  xml_payload text,
  error_message text,
  issued_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fiscal_documents_tenant_created
  ON fiscal_documents (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS fiscal_documents_order
  ON fiscal_documents (order_id)
  WHERE order_id IS NOT NULL;

-- Token público da mesa (QR) — opcional; se nulo, usa o nome da mesa na URL
ALTER TABLE salon_tables
  ADD COLUMN IF NOT EXISTS public_token uuid DEFAULT gen_random_uuid();

UPDATE salon_tables
SET public_token = gen_random_uuid()
WHERE public_token IS NULL;
