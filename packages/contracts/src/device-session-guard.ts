import type {
  DeviceSessionGuardResult,
} from "@clinicos/types/device-session-guard";
import type { DeviceId } from "@clinicos/types/device";
import type { DeviceSessionId } from "@clinicos/types/device-session";
import type { TenantId, UserId } from "@clinicos/types/tenant";

export interface CheckDeviceSessionRequest {
  sessionId: DeviceSessionId;
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
}

export type CheckDeviceSessionResponse = DeviceSessionGuardResult;

export interface RequireDeviceSessionRequest {
  sessionId: DeviceSessionId;
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
}
