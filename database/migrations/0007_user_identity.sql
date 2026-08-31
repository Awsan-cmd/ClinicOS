ALTER TABLE users
  ADD COLUMN role TEXT NOT NULL DEFAULT 'receptionist',
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (
    role IN (
      'owner',
      'admin',
      'manager',
      'doctor',
      'receptionist',
      'nurse'
    )
  );
