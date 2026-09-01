import { describe, expect, it } from "vitest";
import type { SessionId } from "@clinicos/types/session";
import { requirePermission } from "../src/authorization.js";
import type { RequestContext } from "../src/context.js";

const context: RequestContext = {
  requestId: "request-1",
  correlationId: "correlation-1",
  authenticatedUser: {
    sessionId: "session-test" as SessionId,
    identity: {
      userId: "user-1" as never,
      tenantId: "tenant-1" as never,
      email: "doctor@example.com",
      role: "doctor",
      isActive: true,
    },
    context: {
      tenantId: "tenant-1" as never,
      branchId: "branch-1" as never,
    },
  },
};

describe("ClinicOS API authorization boundary", () => {
  it("rejects unauthenticated requests", () => {
    expect(() =>
      requirePermission(
        {
          requestId: "request-1",
          correlationId: "correlation-1",
        },
        "patient:read",
      ),
    ).toThrowError("Authentication is required.");
  });

  it("allows a role with the requested permission", () => {
    expect(() =>
      requirePermission(context, "clinical:manage"),
    ).not.toThrow();
  });

  it("rejects a role without the requested permission", () => {
    expect(() =>
      requirePermission(context, "billing:manage"),
    ).toThrowError(
      "You do not have permission to perform this action.",
    );
  });

  it("rejects inactive authenticated users", () => {
    expect(() =>
      requirePermission(
        {
          ...context,
          authenticatedUser: {
            ...context.authenticatedUser!,
            identity: {
              ...context.authenticatedUser!.identity,
              isActive: false,
            },
          },
        },
        "clinical:read",
      ),
    ).toThrowError(
      "You do not have permission to perform this action.",
    );
  });
});
