CREATE TABLE services (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code),
  CHECK (duration_minutes > 0)
);

CREATE INDEX services_tenant_id_idx
  ON services (tenant_id);

CREATE INDEX services_tenant_branch_id_idx
  ON services (tenant_id, branch_id);

ALTER TABLE branches
  ADD CONSTRAINT branches_tenant_id_id_unique
  UNIQUE (tenant_id, id);

ALTER TABLE services
  DROP CONSTRAINT IF EXISTS services_tenant_branch_fk;

ALTER TABLE services
  ADD CONSTRAINT services_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE CASCADE;
