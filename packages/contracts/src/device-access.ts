import type {
  DeviceAccess,
  DeviceAccessId,
  DeviceAccessStatus,
} from "@clinicos/types/device-access";
import type { BranchId, TenantId, UserId } from "@clinicos/types/tenant";
import type { DeviceId } from "@clinicos/types/device";

export interface GrantDeviceAccessRequest {
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
  branchId?: BranchId;
}

export interface GrantDeviceAccessResponse {
  accessId: DeviceAccessId;
  tenantId: TenantId;
  deviceId: DeviceId;
  userId: UserId;
  branchId?: BranchId;
  status: DeviceAccessStatus;
}

export interface RevokeDeviceAccessRequest {
  accessId: DeviceAccessId;
}

export interface DeviceAccessResponse extends DeviceAccess {}
