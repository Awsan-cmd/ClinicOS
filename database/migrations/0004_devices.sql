CREATE TABLE devices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  platform TEXT NOT NULL,
  android_api_level INTEGER NOT NULL,
  app_version TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  connectivity TEXT NOT NULL DEFAULT 'unknown',
  last_heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX devices_tenant_id_idx
  ON devices (tenant_id);

CREATE INDEX devices_branch_id_idx
  ON devices (branch_id);

CREATE INDEX devices_status_idx
  ON devices (status);

CREATE INDEX devices_last_heartbeat_at_idx
  ON devices (last_heartbeat_at);

CREATE INDEX devices_tenant_status_idx
  ON devices (tenant_id, status);
