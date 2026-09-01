import type { TenantContext } from "./tenant.js";
import type { SessionId } from "@clinicos/types/session";
import type { UserIdentity } from "@clinicos/types/identity";

export interface AuthenticatedUser {
  sessionId: SessionId;
  identity: UserIdentity;
  context: TenantContext;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserIdentity;
  context: TenantContext;
}
