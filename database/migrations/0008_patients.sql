CREATE TABLE patients (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  medical_record_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, medical_record_number)
);

CREATE INDEX patients_tenant_id_idx
  ON patients (tenant_id);

CREATE INDEX patients_tenant_branch_id_idx
  ON patients (tenant_id, branch_id);
