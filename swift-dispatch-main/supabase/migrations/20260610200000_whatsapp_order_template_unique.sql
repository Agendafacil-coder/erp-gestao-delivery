-- Um envio por (pedido, template) — evita race TOCTOU em driver_arriving
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_message_logs_order_template_unique
  ON whatsapp_message_logs (order_id, template_key)
  WHERE order_id IS NOT NULL AND template_key IS NOT NULL;
