import type { Pool } from "pg";

export type DeviceSessionGuardReason =
  | "session_not_found"
  | "session_revoked"
  | "session_expired"
  | "device_revoked"
  | "device_access_revoked"
  | "tenant_mismatch"
  | "identity_mismatch";

export interface DeviceSessionGuardInput {
  sessionId: string;
  tenantId: string;
  deviceId: string;
  userId: string;
}

export interface DeviceSessionGuardAllowed {
  allowed: true;
  tenantId: string;
  deviceId: string;
  userId: string;
  sessionId: string;
}

export interface DeviceSessionGuardDenied {
  allowed: false;
  reason: DeviceSessionGuardReason;
}

export type DeviceSessionGuardResult =
  | DeviceSessionGuardAllowed
  | DeviceSessionGuardDenied;

export async function checkDeviceSession(
  pool: Pool,
  input: DeviceSessionGuardInput,
): Promise<DeviceSessionGuardResult> {
  const result = await pool.query(
    `
      SELECT
        ds.id,
        ds.tenant_id,
        ds.device_id,
        ds.user_id,
        ds.status AS session_status,
        ds.expires_at,
        d.status AS device_status,
        da.status AS access_status
      FROM device_sessions ds
      LEFT JOIN devices d
        ON d.id = ds.device_id
       AND d.tenant_id = ds.tenant_id
      LEFT JOIN device_access da
        ON da.device_id = ds.device_id
       AND da.user_id = ds.user_id
       AND da.tenant_id = ds.tenant_id
       AND da.status = 'active'
      WHERE ds.id = $1
        AND ds.tenant_id = $2
        AND ds.device_id = $3
        AND ds.user_id = $4
      LIMIT 1
    `,
    [
      input.sessionId,
      input.tenantId,
      input.deviceId,
      input.userId,
    ],
  );

  if (result.rowCount !== 1) {
    return {
      allowed: false,
      reason: "session_not_found",
    };
  }

  const row = result.rows[0] as {
    id: string;
    tenant_id: string;
    device_id: string;
    user_id: string;
    session_status: string;
    expires_at: Date | string;
    device_status: string | null;
    access_status: string | null;
  };

  if (row.session_status !== "active") {
    return {
      allowed: false,
      reason: "session_revoked",
    };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return {
      allowed: false,
      reason: "session_expired",
    };
  }

  if (row.device_status !== "active") {
    return {
      allowed: false,
      reason: "device_revoked",
    };
  }

  if (row.access_status !== "active") {
    return {
      allowed: false,
      reason: "device_access_revoked",
    };
  }

  return {
    allowed: true,
    tenantId: row.tenant_id,
    deviceId: row.device_id,
    userId: row.user_id,
    sessionId: row.id,
  };
}
