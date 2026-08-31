import type { TenantId, UserId } from "./tenant.js";
import type { DeviceId } from "./device.js";

export type DeviceSessionId = string & {
  readonly __brand: "DeviceSessionId";
};

export type DeviceSessionStatus = "active" | "revoked" | "expired";

export interface DeviceSession {
  sessionId: DeviceSessionId;
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
  status: DeviceSessionStatus;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt?: string;
}
