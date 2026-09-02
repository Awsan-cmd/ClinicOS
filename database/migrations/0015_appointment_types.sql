CREATE TABLE appointment_types (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, code)
);

CREATE INDEX appointment_types_tenant_id_idx
  ON appointment_types (tenant_id);

CREATE INDEX appointment_types_tenant_branch_id_idx
  ON appointment_types (tenant_id, branch_id);

ALTER TABLE appointment_types
  ADD CONSTRAINT appointment_types_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE CASCADE;
