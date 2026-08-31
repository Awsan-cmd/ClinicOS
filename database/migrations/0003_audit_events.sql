CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_events_tenant_id_idx
  ON audit_events (tenant_id);

CREATE INDEX audit_events_user_id_idx
  ON audit_events (user_id);

CREATE INDEX audit_events_branch_id_idx
  ON audit_events (branch_id);

CREATE INDEX audit_events_created_at_idx
  ON audit_events (created_at);

CREATE INDEX audit_events_resource_idx
  ON audit_events (resource, resource_id);
