CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_locations_driver_recorded_idx
  ON driver_locations (driver_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS driver_locations_order_recorded_idx
  ON driver_locations (order_id, recorded_at ASC)
  WHERE order_id IS NOT NULL;
