import type { BranchId, TenantId, UserId } from "./tenant.js";

export type ProviderType =
  | "doctor"
  | "dentist"
  | "nurse"
  | "therapist"
  | "other";

export interface StaffMember {
  id: string;
  tenantId: TenantId;
  userId: UserId;
  branchId?: BranchId;
  displayName: string;
  jobTitle?: string;
  phone?: string;
  createdAt: string;
}

export interface Provider {
  id: string;
  tenantId: TenantId;
  staffMemberId: string;
  providerType: ProviderType;
  specialty?: string;
  licenseNumber?: string;
  createdAt: string;
}
