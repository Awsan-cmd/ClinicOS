import type { BranchId, TenantId, UserId } from "./tenant.js";

export type SessionId = string & {
  readonly __brand: "SessionId";
};

export interface UserSession {
  sessionId: SessionId;
  userId: UserId;
  tenantId: TenantId;
  branchId?: BranchId;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}
