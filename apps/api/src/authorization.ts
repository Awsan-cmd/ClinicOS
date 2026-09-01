import type { Permission } from "@clinicos/types/permission";
import { authorize } from "@clinicos/auth/authorization";
import type { RequestContext } from "./context.js";
import { ApiError } from "./errors.js";

export function requirePermission(
  context: RequestContext,
  permission: Permission,
): void {
  const authenticatedUser = context.authenticatedUser;

  if (!authenticatedUser) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authentication is required.",
    );
  }

  const authorizationContext = {
    userId: authenticatedUser.identity.userId,
    tenantId: authenticatedUser.identity.tenantId,
    role: authenticatedUser.identity.role,
    isActive: authenticatedUser.identity.isActive,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
  };

  const result = authorize(
    authorizationContext,
    permission,
  );

  if (!result.allowed) {
    throw new ApiError(
      403,
      "forbidden",
      "You do not have permission to perform this action.",
    );
  }
}
