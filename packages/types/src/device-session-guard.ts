import type { TenantId, UserId } from "./tenant.js";
import type { DeviceId } from "./device.js";
import type { DeviceSessionId } from "./device-session.js";

export type DeviceSessionGuardResult =
  | {
      allowed: true;
      tenantId: TenantId;
      userId: UserId;
      deviceId: DeviceId;
      sessionId: DeviceSessionId;
    }
  | {
      allowed: false;
      reason:
        | "session_not_found"
        | "session_revoked"
        | "session_expired"
        | "device_revoked"
        | "device_access_revoked"
        | "tenant_mismatch"
        | "identity_mismatch";
    };
