CREATE TABLE working_hours (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, id),
  CHECK (day_of_week BETWEEN 0 AND 6),
  CHECK (start_time < end_time)
);

CREATE INDEX working_hours_tenant_id_idx
  ON working_hours (tenant_id);

CREATE INDEX working_hours_tenant_branch_id_idx
  ON working_hours (tenant_id, branch_id);

ALTER TABLE working_hours
  ADD CONSTRAINT working_hours_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE CASCADE;


CREATE TABLE schedule_breaks (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, id),
  CHECK (day_of_week BETWEEN 0 AND 6),
  CHECK (start_time < end_time)
);

CREATE INDEX schedule_breaks_tenant_id_idx
  ON schedule_breaks (tenant_id);

CREATE INDEX schedule_breaks_tenant_branch_id_idx
  ON schedule_breaks (tenant_id, branch_id);

ALTER TABLE schedule_breaks
  ADD CONSTRAINT schedule_breaks_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE CASCADE;


CREATE TABLE holidays (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID,
  holiday_date DATE NOT NULL,
  name TEXT,
  is_full_day BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, id)
);

CREATE INDEX holidays_tenant_id_idx
  ON holidays (tenant_id);

CREATE INDEX holidays_tenant_branch_id_idx
  ON holidays (tenant_id, branch_id);

CREATE INDEX holidays_tenant_date_idx
  ON holidays (tenant_id, holiday_date);

ALTER TABLE holidays
  ADD CONSTRAINT holidays_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE CASCADE;
