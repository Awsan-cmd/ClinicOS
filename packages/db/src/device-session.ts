import type { Pool } from "pg";

export interface CreateDeviceSessionRecord {
  id: string;
  tenantId: string;
  deviceId: string;
  userId: string;
  expiresAt: string;
}

export async function createDeviceSession(
  pool: Pool,
  session: CreateDeviceSessionRecord,
): Promise<boolean> {
  const result = await pool.query(
    `
      INSERT INTO device_sessions (
        id,
        tenant_id,
        device_id,
        user_id,
        expires_at
      )
      SELECT
        $1,
        $2,
        $3,
        $4,
        $5
      WHERE EXISTS (
        SELECT 1
        FROM device_access
        WHERE tenant_id = $2
          AND device_id = $3
          AND user_id = $4
          AND status = 'active'
      )
      AND EXISTS (
        SELECT 1
        FROM devices
        WHERE id = $3
          AND tenant_id = $2
          AND status = 'active'
      )
      AND $5 > NOW()
      RETURNING id
    `,
    [
      session.id,
      session.tenantId,
      session.deviceId,
      session.userId,
      session.expiresAt,
    ],
  );

  return result.rowCount === 1;
}

export async function revokeDeviceSession(
  pool: Pool,
  input: {
    sessionId: string;
    tenantId: string;
  },
): Promise<void> {
  await pool.query(
    `
      UPDATE device_sessions
      SET
        status = 'revoked',
        revoked_at = NOW()
      WHERE id = $1
        AND tenant_id = $2
    `,
    [input.sessionId, input.tenantId],
  );
}

export async function touchDeviceSession(
  pool: Pool,
  input: {
    sessionId: string;
    tenantId: string;
    deviceId: string;
    userId: string;
  },
): Promise<void> {
  await pool.query(
    `
      UPDATE device_sessions
      SET last_seen_at = NOW()
      WHERE id = $1
        AND tenant_id = $2
        AND device_id = $3
        AND user_id = $4
        AND status = 'active'
        AND expires_at > NOW()
        AND EXISTS (
          SELECT 1
          FROM device_access
          WHERE tenant_id = $2
            AND device_id = $3
            AND user_id = $4
            AND status = 'active'
        )
        AND EXISTS (
          SELECT 1
          FROM devices
          WHERE id = $3
            AND tenant_id = $2
            AND status = 'active'
        )
    `,
    [
      input.sessionId,
      input.tenantId,
      input.deviceId,
      input.userId,
    ],
  );
}

export async function hasActiveDeviceSession(
  pool: Pool,
  input: {
    sessionId: string;
    tenantId: string;
    deviceId: string;
    userId: string;
  },
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM device_sessions
      WHERE id = $1
        AND tenant_id = $2
        AND device_id = $3
        AND user_id = $4
        AND status = 'active'
        AND expires_at > NOW()
        AND EXISTS (
          SELECT 1
          FROM device_access
          WHERE tenant_id = $2
            AND device_id = $3
            AND user_id = $4
            AND status = 'active'
        )
        AND EXISTS (
          SELECT 1
          FROM devices
          WHERE id = $3
            AND tenant_id = $2
            AND status = 'active'
        )
      LIMIT 1
    `,
    [
      input.sessionId,
      input.tenantId,
      input.deviceId,
      input.userId,
    ],
  );

  return result.rowCount === 1;
}
