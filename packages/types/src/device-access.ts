import type { BranchId, TenantId, UserId } from "./tenant.js";
import type { DeviceId } from "./device.js";

export type DeviceAccessId = string & {
  readonly __brand: "DeviceAccessId";
};

export type DeviceAccessStatus = "active" | "revoked";

export interface DeviceAccess {
  accessId: DeviceAccessId;
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
  branchId?: BranchId;
  status: DeviceAccessStatus;
  grantedAt: string;
  revokedAt?: string;
}
