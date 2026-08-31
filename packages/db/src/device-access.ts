import type { Pool } from "pg";

export interface GrantDeviceAccessRecord {
  id: string;
  tenantId: string;
  deviceId: string;
  userId: string;
  branchId?: string;
}

export async function grantDeviceAccess(
  pool: Pool,
  access: GrantDeviceAccessRecord,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO device_access (
        id,
        tenant_id,
        device_id,
        user_id,
        branch_id
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      access.id,
      access.tenantId,
      access.deviceId,
      access.userId,
      access.branchId ?? null,
    ],
  );
}

export async function revokeDeviceAccess(
  pool: Pool,
  input: {
    accessId: string;
    tenantId: string;
  },
): Promise<void> {
  await pool.query(
    `
      WITH revoked_access AS (
        UPDATE device_access
        SET
          status = 'revoked',
          revoked_at = NOW()
        WHERE id = $1
          AND tenant_id = $2
        RETURNING tenant_id, device_id, user_id
      )
      UPDATE device_sessions AS ds
      SET
        status = 'revoked',
        revoked_at = NOW()
      FROM revoked_access AS ra
      WHERE ds.tenant_id = ra.tenant_id
        AND ds.device_id = ra.device_id
        AND ds.user_id = ra.user_id
        AND ds.status = 'active'
    `,
    [input.accessId, input.tenantId],
  );
}

export async function hasActiveDeviceAccess(
  pool: Pool,
  input: {
    tenantId: string;
    deviceId: string;
    userId: string;
  },
): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM device_access
      WHERE tenant_id = $1
        AND device_id = $2
        AND user_id = $3
        AND status = 'active'
      LIMIT 1
    `,
    [input.tenantId, input.deviceId, input.userId],
  );

  return result.rowCount === 1;
}
