-- Permite múltiplos eventos (PLC, CAN, CON) para o mesmo pedido iFood
DROP INDEX IF EXISTS ifood_inbound_events_external_idx;

CREATE UNIQUE INDEX IF NOT EXISTS ifood_inbound_events_external_type_idx
  ON ifood_inbound_events (tenant_id, external_order_id, event_type)
  WHERE external_order_id IS NOT NULL;
