import type {
  DeviceSession,
  DeviceSessionId,
  DeviceSessionStatus,
} from "@clinicos/types/device-session";
import type { TenantId, UserId } from "@clinicos/types/tenant";
import type { DeviceId } from "@clinicos/types/device";

export interface CreateDeviceSessionRequest {
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
  expiresAt: string;
}

export interface CreateDeviceSessionResponse {
  sessionId: DeviceSessionId;
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
  status: DeviceSessionStatus;
  expiresAt: string;
}

export interface RevokeDeviceSessionRequest {
  sessionId: DeviceSessionId;
}

export interface TouchDeviceSessionRequest {
  sessionId: DeviceSessionId;
}

export interface DeviceSessionResponse extends DeviceSession {}
