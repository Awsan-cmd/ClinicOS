CREATE TABLE booking_rules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  provider_id UUID,
  service_id UUID,
  appointment_type_id UUID,
  resource_id UUID,
  advance_booking_days INTEGER NOT NULL DEFAULT 0,
  minimum_notice_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, id),
  CHECK (advance_booking_days >= 0),
  CHECK (minimum_notice_minutes >= 0)
);

CREATE INDEX booking_rules_tenant_id_idx
  ON booking_rules (tenant_id);

CREATE INDEX booking_rules_tenant_branch_id_idx
  ON booking_rules (tenant_id, branch_id);

CREATE INDEX booking_rules_tenant_provider_id_idx
  ON booking_rules (tenant_id, provider_id);

CREATE INDEX booking_rules_tenant_service_id_idx
  ON booking_rules (tenant_id, service_id);

CREATE INDEX booking_rules_tenant_appointment_type_id_idx
  ON booking_rules (tenant_id, appointment_type_id);

CREATE INDEX booking_rules_tenant_resource_id_idx
  ON booking_rules (tenant_id, resource_id);

ALTER TABLE booking_rules
  ADD CONSTRAINT booking_rules_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE booking_rules
  ADD CONSTRAINT booking_rules_tenant_provider_fk
  FOREIGN KEY (tenant_id, provider_id)
  REFERENCES providers (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE booking_rules
  ADD CONSTRAINT booking_rules_tenant_service_fk
  FOREIGN KEY (tenant_id, service_id)
  REFERENCES services (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE booking_rules
  ADD CONSTRAINT booking_rules_tenant_appointment_type_fk
  FOREIGN KEY (tenant_id, appointment_type_id)
  REFERENCES appointment_types (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE booking_rules
  ADD CONSTRAINT booking_rules_tenant_resource_fk
  FOREIGN KEY (tenant_id, resource_id)
  REFERENCES resources (tenant_id, id)
  ON DELETE CASCADE;
