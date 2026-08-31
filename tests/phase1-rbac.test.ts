import { describe, expect, it } from "vitest";
import {
  ROLE_PERMISSIONS,
  type Permission,
} from "@clinicos/types/permission";
import {
  authorize,
  hasPermission,
  type AuthorizationContext,
} from "@clinicos/auth/authorization";

const context: AuthorizationContext = {
  userId: "user-1" as AuthorizationContext["userId"],
  tenantId: "tenant-1" as AuthorizationContext["tenantId"],
  role: "doctor",
  isActive: true,
};

describe("ClinicOS Phase 1 RBAC foundation", () => {
  it("defines permissions for every application role", () => {
    expect(Object.keys(ROLE_PERMISSIONS)).toEqual([
      "owner",
      "admin",
      "manager",
      "doctor",
      "receptionist",
      "nurse",
    ]);

    for (const permissions of Object.values(ROLE_PERMISSIONS)) {
      expect(permissions.length).toBeGreaterThan(0);
    }
  });

  it("allows a role only when the permission is assigned", () => {
    expect(hasPermission("doctor", "clinical:manage")).toBe(true);
    expect(hasPermission("doctor", "billing:manage")).toBe(false);
    expect(hasPermission("receptionist", "appointment:manage")).toBe(true);
    expect(hasPermission("receptionist", "clinical:manage")).toBe(false);
  });

  it("denies inactive users", () => {
    const result = authorize(
      { ...context, isActive: false },
      "clinical:read",
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("inactive_user");
  });

  it("denies missing permissions by default", () => {
    const result = authorize(context, "billing:manage");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing_permission");
  });

  it("allows an active user with the assigned permission", () => {
    const result = authorize(context, "clinical:manage");

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("allowed");
  });

  it("keeps permission identifiers strongly typed", () => {
    const permission: Permission = "patient:read";
    expect(permission).toBe("patient:read");
  });
});
