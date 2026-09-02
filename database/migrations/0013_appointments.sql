ALTER TABLE patients
  ADD CONSTRAINT patients_tenant_id_id_unique
  UNIQUE (tenant_id, id);

ALTER TABLE services
  ADD CONSTRAINT services_tenant_id_id_unique
  UNIQUE (tenant_id, id);

CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  service_id UUID NOT NULL,
  resource_id UUID,
  appointment_type TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'scheduled',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, id),

  CHECK (starts_at < ends_at),

  CHECK (
    appointment_type IN (
      'standard',
      'follow_up',
      'consultation',
      'procedure'
    )
  ),

  CHECK (
    status IN (
      'scheduled',
      'confirmed',
      'completed',
      'cancelled',
      'no_show'
    )
  )
);

CREATE INDEX appointments_tenant_id_idx
  ON appointments (tenant_id);

CREATE INDEX appointments_tenant_branch_id_idx
  ON appointments (tenant_id, branch_id);

CREATE INDEX appointments_tenant_patient_id_idx
  ON appointments (tenant_id, patient_id);

CREATE INDEX appointments_tenant_provider_id_idx
  ON appointments (tenant_id, provider_id);

CREATE INDEX appointments_tenant_service_id_idx
  ON appointments (tenant_id, service_id);

CREATE INDEX appointments_tenant_resource_id_idx
  ON appointments (tenant_id, resource_id);

CREATE INDEX appointments_tenant_starts_at_idx
  ON appointments (tenant_id, starts_at);

ALTER TABLE appointments
  ADD CONSTRAINT appointments_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_tenant_patient_fk
  FOREIGN KEY (tenant_id, patient_id)
  REFERENCES patients (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_tenant_provider_fk
  FOREIGN KEY (tenant_id, provider_id)
  REFERENCES providers (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_tenant_service_fk
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES services (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_tenant_resource_fk
  FOREIGN KEY (tenant_id, resource_id)
  REFERENCES resources (tenant_id, id)
  ON DELETE CASCADE;
