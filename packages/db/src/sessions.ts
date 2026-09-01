import type { Pool } from "pg";

export interface CreateSessionRecord {
  id: string;
  userId: string;
  tenantId: string;
  branchId?: string;
  tokenHash: string;
  expiresAt: Date;
}

export async function createSession(
  pool: Pool,
  session: CreateSessionRecord,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO sessions (
        id,
        user_id,
        tenant_id,
        branch_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      session.id,
      session.userId,
      session.tenantId,
      session.branchId ?? null,
      session.tokenHash,
      session.expiresAt,
    ],
  );
}

export async function revokeSession(
  pool: Pool,
  sessionId: string,
): Promise<void> {
  await pool.query(
    `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE id = $1
        AND revoked_at IS NULL
    `,
    [sessionId],
  );
}

export async function revokeAuthenticatedSession(
  pool: Pool,
  session: {
    sessionId: string;
    userId: string;
    tenantId: string;
  },
): Promise<boolean> {
  const result = await pool.query(
    `
      UPDATE sessions
      SET revoked_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND tenant_id = $3
        AND revoked_at IS NULL
    `,
    [session.sessionId, session.userId, session.tenantId],
  );

  return result.rowCount === 1;
}
