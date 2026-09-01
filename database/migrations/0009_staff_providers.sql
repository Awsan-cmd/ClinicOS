CREATE TABLE staff_members (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  job_title TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX staff_members_tenant_id_idx
  ON staff_members (tenant_id);

CREATE INDEX staff_members_tenant_branch_id_idx
  ON staff_members (tenant_id, branch_id);

ALTER TABLE users
  ADD CONSTRAINT users_tenant_id_id_unique
  UNIQUE (tenant_id, id);

ALTER TABLE staff_members
  DROP CONSTRAINT IF EXISTS staff_members_user_id_fkey;

ALTER TABLE staff_members
  ADD CONSTRAINT staff_members_tenant_user_fk
  FOREIGN KEY (tenant_id, user_id)
  REFERENCES users (tenant_id, id)
  ON DELETE CASCADE;

ALTER TABLE staff_members
  ADD CONSTRAINT staff_members_tenant_id_id_unique
  UNIQUE (tenant_id, id);

CREATE TABLE providers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  specialty TEXT,
  license_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, staff_member_id),
  CHECK (
    provider_type IN (
      'doctor',
      'dentist',
      'nurse',
      'therapist',
      'other'
    )
  )
);

CREATE INDEX providers_tenant_id_idx
  ON providers (tenant_id);

CREATE INDEX providers_tenant_staff_member_id_idx
  ON providers (tenant_id, staff_member_id);

ALTER TABLE providers
  DROP CONSTRAINT IF EXISTS providers_staff_member_id_fkey;

ALTER TABLE providers
  ADD CONSTRAINT providers_tenant_staff_member_fk
  FOREIGN KEY (tenant_id, staff_member_id)
  REFERENCES staff_members (tenant_id, id)
  ON DELETE CASCADE;
