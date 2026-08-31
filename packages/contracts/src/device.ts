import type {
  ClinicDevice,
  DeviceCapability,
  DeviceId,
  DeviceConnectivity,
  DeviceStatus,
} from "@clinicos/types/device";
import type { BranchId, TenantId } from "@clinicos/types/tenant";

export interface EnrollDeviceRequest {
  tenantId: TenantId;
  branchId?: BranchId;
  platform: "android";
  androidApiLevel: number;
  appVersion: string;
  capabilities: readonly DeviceCapability[];
}

export interface EnrollDeviceResponse {
  deviceId: DeviceId;
  status: DeviceStatus;
  tenantId: TenantId;
  branchId?: BranchId;
}

export interface RevokeDeviceRequest {
  deviceId: DeviceId;
}

export interface DeviceHeartbeatRequest {
  deviceId: DeviceId;
  connectivity: DeviceConnectivity;
  capabilities: readonly DeviceCapability[];
  androidApiLevel: number;
  appVersion: string;
}

export interface DeviceResponse extends ClinicDevice {}
