ALTER TABLE providers
  ADD CONSTRAINT providers_tenant_id_id_unique
  UNIQUE (tenant_id, id);

CREATE TABLE resources (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code),
  UNIQUE (tenant_id, id),
  CHECK (
    resource_type IN (
      'room',
      'chair',
      'equipment',
      'other'
    )
  )
);

CREATE INDEX resources_tenant_id_idx
  ON resources (tenant_id);

CREATE INDEX resources_tenant_branch_id_idx
  ON resources (tenant_id, branch_id);

ALTER TABLE resources
  ADD CONSTRAINT resources_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL (branch_id);

CREATE TABLE availability_rules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  provider_id UUID,
  resource_id UUID,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (day_of_week BETWEEN 0 AND 6),
  CHECK (start_time < end_time),
  CHECK (provider_id IS NOT NULL OR resource_id IS NOT NULL)
);

CREATE INDEX availability_rules_tenant_id_idx
  ON availability_rules (tenant_id);

CREATE INDEX availability_rules_tenant_branch_id_idx
  ON availability_rules (tenant_id, branch_id);

CREATE INDEX availability_rules_tenant_provider_id_idx
  ON availability_rules (tenant_id, provider_id);

CREATE INDEX availability_rules_tenant_resource_id_idx
  ON availability_rules (tenant_id, resource_id);

ALTER TABLE availability_rules
  ADD CONSTRAINT availability_rules_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL (branch_id);

ALTER TABLE availability_rules
  ADD CONSTRAINT availability_rules_tenant_provider_fk
  FOREIGN KEY (tenant_id, provider_id)
  REFERENCES providers (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE availability_rules
  ADD CONSTRAINT availability_rules_tenant_resource_fk
  FOREIGN KEY (tenant_id, resource_id)
  REFERENCES resources (tenant_id, id)
  ON DELETE CASCADE;
