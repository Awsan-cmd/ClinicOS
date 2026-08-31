CREATE TABLE device_access (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX device_access_tenant_id_idx
  ON device_access (tenant_id);

CREATE INDEX device_access_device_id_idx
  ON device_access (device_id);

CREATE INDEX device_access_user_id_idx
  ON device_access (user_id);

CREATE INDEX device_access_branch_id_idx
  ON device_access (branch_id);

CREATE INDEX device_access_status_idx
  ON device_access (status);

CREATE INDEX device_access_tenant_device_idx
  ON device_access (tenant_id, device_id);

CREATE INDEX device_access_tenant_user_idx
  ON device_access (tenant_id, user_id);
