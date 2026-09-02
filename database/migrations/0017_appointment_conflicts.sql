CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_provider_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    provider_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('scheduled', 'confirmed'));

ALTER TABLE appointments
  ADD CONSTRAINT appointments_resource_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    resource_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (
    resource_id IS NOT NULL
    AND status IN ('scheduled', 'confirmed')
  );
