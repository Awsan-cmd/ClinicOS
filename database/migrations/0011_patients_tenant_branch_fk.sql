ALTER TABLE patients
  DROP CONSTRAINT IF EXISTS patients_branch_id_fkey;

ALTER TABLE patients
  ADD CONSTRAINT patients_tenant_branch_fk
  FOREIGN KEY (tenant_id, branch_id)
  REFERENCES branches (tenant_id, id)
  ON DELETE SET NULL (branch_id);
