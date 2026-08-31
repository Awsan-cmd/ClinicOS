import type { Pool } from "pg";

export interface CreateDeviceRecord {
  id: string;
  tenantId: string;
  branchId?: string;
  platform: "android";
  androidApiLevel: number;
  appVersion: string;
  capabilities: readonly string[];
}

export async function createDevice(
  pool: Pool,
  device: CreateDeviceRecord,
): Promise<void> {
  await pool.query(
    `
      INSERT INTO devices (
        id,
        tenant_id,
        branch_id,
        platform,
        android_api_level,
        app_version,
        capabilities
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      device.id,
      device.tenantId,
      device.branchId ?? null,
      device.platform,
      device.androidApiLevel,
      device.appVersion,
      JSON.stringify(device.capabilities),
    ],
  );
}

export async function revokeDevice(
  pool: Pool,
  deviceId: string,
): Promise<void> {
  await pool.query(
    `
      UPDATE devices
      SET
        status = 'revoked',
        revoked_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [deviceId],
  );
}

export async function heartbeatDevice(
  pool: Pool,
  device: {
    id: string;
    connectivity: string;
    androidApiLevel: number;
    appVersion: string;
    capabilities: readonly string[];
  },
): Promise<void> {
  await pool.query(
    `
      UPDATE devices
      SET
        connectivity = $2,
        android_api_level = $3,
        app_version = $4,
        capabilities = $5,
        last_heartbeat_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND status = 'active'
    `,
    [
      device.id,
      device.connectivity,
      device.androidApiLevel,
      device.appVersion,
      JSON.stringify(device.capabilities),
    ],
  );
}
