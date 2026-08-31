CREATE TABLE device_sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX device_sessions_tenant_id_idx
  ON device_sessions (tenant_id);

CREATE INDEX device_sessions_device_id_idx
  ON device_sessions (device_id);

CREATE INDEX device_sessions_user_id_idx
  ON device_sessions (user_id);

CREATE INDEX device_sessions_status_idx
  ON device_sessions (status);

CREATE INDEX device_sessions_expires_at_idx
  ON device_sessions (expires_at);

CREATE INDEX device_sessions_tenant_device_idx
  ON device_sessions (tenant_id, device_id);

CREATE INDEX device_sessions_tenant_user_idx
  ON device_sessions (tenant_id, user_id);
