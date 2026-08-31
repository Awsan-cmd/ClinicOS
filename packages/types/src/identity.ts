import type { TenantId, UserId } from "./tenant.js";

export type UserRole =
  | "owner"
  | "admin"
  | "manager"
  | "doctor"
  | "receptionist"
  | "nurse";

export interface UserIdentity {
  userId: UserId;
  tenantId: TenantId;
  email: string;
  role: UserRole;
  isActive: boolean;
}
