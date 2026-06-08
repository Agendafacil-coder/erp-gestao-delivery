ALTER TABLE ifood_tenant_config
  ADD COLUMN IF NOT EXISTS polling_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_poll_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_poll_status text,
  ADD COLUMN IF NOT EXISTS last_poll_message text;

ALTER TABLE ifood_inbound_events
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'webhook',
  ADD COLUMN IF NOT EXISTS ifood_event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS ifood_inbound_events_ifood_event_id_idx
  ON ifood_inbound_events (tenant_id, ifood_event_id)
  WHERE ifood_event_id IS NOT NULL;
