ALTER TABLE ifood_tenant_config
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS client_secret text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorization_code_verifier text,
  ADD COLUMN IF NOT EXISTS pending_user_code text,
  ADD COLUMN IF NOT EXISTS pending_user_code_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_url text;
