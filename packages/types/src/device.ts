import type { BranchId, TenantId } from "./tenant.js";

export type DeviceId = string & {
  readonly __brand: "DeviceId";
};

export type DeviceStatus = "active" | "revoked";

export type DeviceCapability =
  | "telephony"
  | "sms"
  | "microphone"
  | "audio"
  | "realtime"
  | "notifications"
  | "background_execution";

export type DeviceConnectivity = "online" | "offline" | "unknown";

export interface ClinicDevice {
  deviceId: DeviceId;
  tenantId: TenantId;
  branchId?: BranchId;
  status: DeviceStatus;
  platform: "android";
  androidApiLevel: number;
  appVersion: string;
  capabilities: readonly DeviceCapability[];
  connectivity: DeviceConnectivity;
  lastHeartbeatAt?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}
