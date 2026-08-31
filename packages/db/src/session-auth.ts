import type { Pool } from "pg";

export interface AuthenticatedSessionRecord {
  sessionId: string;
  userId: string;
  tenantId: string;
  branchId?: string;
  expiresAt: Date;
}

export async function findActiveSessionByTokenHash(
  pool: Pool,
  tokenHash: string,
): Promise<AuthenticatedSessionRecord | undefined> {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        tenant_id,
        branch_id,
        expires_at
      FROM sessions
      WHERE token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash],
  );

  if (result.rowCount !== 1) {
    return undefined;
  }

  const row = result.rows[0] as {
    id: string;
    user_id: string;
    tenant_id: string;
    branch_id: string | null;
    expires_at: Date;
  };

  return {
    sessionId: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    ...(row.branch_id === null
      ? {}
      : { branchId: row.branch_id }),
    expiresAt: row.expires_at,
  };
}
