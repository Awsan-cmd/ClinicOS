import type { Pool } from "pg";

export interface UserIdentityRecord {
  userId: string;
  tenantId: string;
  email: string;
  role:
    | "owner"
    | "admin"
    | "manager"
    | "doctor"
    | "receptionist"
    | "nurse";
  isActive: boolean;
}

export async function findUserIdentity(
  pool: Pool,
  input: {
    userId: string;
    tenantId: string;
  },
): Promise<UserIdentityRecord | undefined> {
  const result = await pool.query(
    `
      SELECT
        id,
        tenant_id,
        email,
        role,
        is_active
      FROM users
      WHERE id = $1
        AND tenant_id = $2
      LIMIT 1
    `,
    [input.userId, input.tenantId],
  );

  if (result.rowCount !== 1) {
    return undefined;
  }

  const row = result.rows[0] as {
    id: string;
    tenant_id: string;
    email: string;
    role: UserIdentityRecord["role"];
    is_active: boolean;
  };

  return {
    userId: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
  };
}
