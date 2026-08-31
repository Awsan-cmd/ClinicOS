import type { BranchId, TenantId, UserId } from "@clinicos/types/tenant";
import type { SessionId } from "@clinicos/types/session";

export interface CreateSessionRequest {
  userId: UserId;
  tenantId: TenantId;
  branchId?: BranchId;
  expiresAt: string;
}

export interface SessionResponse {
  sessionId: SessionId;
  userId: UserId;
  tenantId: TenantId;
  branchId?: BranchId;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}

export interface RevokeSessionRequest {
  sessionId: SessionId;
}
