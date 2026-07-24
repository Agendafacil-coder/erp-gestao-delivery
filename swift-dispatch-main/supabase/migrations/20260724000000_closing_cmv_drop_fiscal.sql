-- CMV no fechamento diário (auditoria) + remover stub fiscal (sem NF no produto)

ALTER TABLE financial_daily_closings
  ADD COLUMN IF NOT EXISTS cmv_total numeric(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE financial_daily_closings
  ADD COLUMN IF NOT EXISTS cmv_source text NOT NULL DEFAULT 'estimate';

DROP TABLE IF EXISTS fiscal_documents;
