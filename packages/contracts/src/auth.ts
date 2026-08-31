import type { TenantContext } from "./tenant.js";
import type { UserIdentity } from "@clinicos/types/identity";

export interface AuthenticatedUser {
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
