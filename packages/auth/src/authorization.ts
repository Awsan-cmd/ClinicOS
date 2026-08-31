import type { Permission } from "@clinicos/types/permission";
import type { UserRole } from "@clinicos/types/identity";
import { ROLE_PERMISSIONS } from "@clinicos/types/permission";
import type { BranchId, TenantId, UserId } from "@clinicos/types/tenant";

export interface AuthorizationContext {
  userId: UserId;
  tenantId: TenantId;
  branchId?: BranchId;
  role: UserRole;
  isActive: boolean;
}

export interface AuthorizationResult {
  allowed: boolean;
  permission: Permission;
  reason:
    | "allowed"
    | "inactive_user"
    | "missing_permission";
}

export function hasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function authorize(
  context: AuthorizationContext,
  permission: Permission,
): AuthorizationResult {
  if (!context.isActive) {
    return {
      allowed: false,
      permission,
      reason: "inactive_user",
    };
  }

  if (!hasPermission(context.role, permission)) {
    return {
      allowed: false,
      permission,
      reason: "missing_permission",
    };
  }

  return {
    allowed: true,
    permission,
    reason: "allowed",
  };
}
