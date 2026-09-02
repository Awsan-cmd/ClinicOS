import { describe, expect, it, vi } from "vitest";

import {
  handleAvailabilityRules,
  handleCreateAvailabilityRule,
} from "../src/routes/availability-rules.js";

import { requirePermission } from "../src/authorization.js";
import { createAvailabilityRule, findAvailabilityRules } from "@clinicos/db/calendar";

vi.mock("../src/authorization.js", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@clinicos/db/calendar", () => ({
  createAvailabilityRule: vi.fn(),
  findAvailabilityRules: vi.fn(),
}));

function createRequest(
  method = "GET",
  url = "/api/v1/availability-rules",
  body = "",
) {
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      if (body) {
        yield Buffer.from(body);
      }
    },
  } as never;
}

function createResponse() {
  const response = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      response.headers[name] = value;
    },
    end: vi.fn(),
  };

  return response as never;
}

function createContext(
  permissions: string[] = [
    "availability:read",
    "availability:manage",
  ],
  branchId?: string,
) {
  return {
    requestId: "request-1",
    correlationId: "correlation-1",
    authenticatedUser: {
      identity: {
        userId: "user-1",
        tenantId: "tenant-1",
      },
      context: {
        branchId,
      },
      permissions,
    },
  } as never;
}

describe("availability-rules route", () => {
  it("requires availability:read when listing rules", async () => {
    const context = createContext(["availability:read"]);

    await handleAvailabilityRules(
      createRequest(),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "availability:read",
    );
  });

  it("lists rules using authenticated tenant and branch context", async () => {
    vi.mocked(findAvailabilityRules).mockResolvedValue([
      {
        id: "rule-1",
        tenantId: "tenant-1",
        branchId: "branch-1",
        providerId: "provider-1",
        resourceId: null,
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
    ]);

    await handleAvailabilityRules(
      createRequest(
        "GET",
        "/api/v1/availability-rules?providerId=provider-1",
      ),
      createResponse(),
      {} as never,
      createContext(["availability:read"], "branch-1"),
    );

    expect(findAvailabilityRules).toHaveBeenCalledWith(
      expect.anything(),
      {
        tenantId: "tenant-1",
        branchId: "branch-1",
        providerId: "provider-1",
      },
    );
  });

  it("rejects a branch outside authenticated branch context", async () => {
    await expect(
      handleAvailabilityRules(
        createRequest(
          "GET",
          "/api/v1/availability-rules?branchId=branch-2",
        ),
        createResponse(),
        {} as never,
        createContext(["availability:read"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });
  });

  it("requires availability:manage when creating a rule", async () => {
    const context = createContext(["availability:manage"]);

    vi.mocked(createAvailabilityRule).mockResolvedValue({
      id: "rule-1",
      tenantId: "tenant-1",
      branchId: null,
      providerId: "provider-1",
      resourceId: null,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateAvailabilityRule(
      createRequest(
        "POST",
        "/api/v1/availability-rules",
        JSON.stringify({
          providerId: "provider-1",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        }),
      ),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "availability:manage",
    );
  });

  it("rejects a rule without provider or resource", async () => {
    await expect(
      handleCreateAvailabilityRule(
        createRequest(
          "POST",
          "/api/v1/availability-rules",
          JSON.stringify({
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["availability:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects empty providerId and resourceId", async () => {
    await expect(
      handleCreateAvailabilityRule(
        createRequest(
          "POST",
          "/api/v1/availability-rules",
          JSON.stringify({
            providerId: "",
            resourceId: "",
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["availability:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects invalid dayOfWeek", async () => {
    await expect(
      handleCreateAvailabilityRule(
        createRequest(
          "POST",
          "/api/v1/availability-rules",
          JSON.stringify({
            providerId: "provider-1",
            dayOfWeek: 7,
            startTime: "09:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["availability:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects invalid time format", async () => {
    await expect(
      handleCreateAvailabilityRule(
        createRequest(
          "POST",
          "/api/v1/availability-rules",
          JSON.stringify({
            providerId: "provider-1",
            dayOfWeek: 1,
            startTime: "9:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["availability:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects a start time that is not earlier than end time", async () => {
    await expect(
      handleCreateAvailabilityRule(
        createRequest(
          "POST",
          "/api/v1/availability-rules",
          JSON.stringify({
            resourceId: "resource-1",
            dayOfWeek: 1,
            startTime: "17:00",
            endTime: "09:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["availability:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects a branch outside authenticated branch context on create", async () => {
    await expect(
      handleCreateAvailabilityRule(
        createRequest(
          "POST",
          "/api/v1/availability-rules",
          JSON.stringify({
            branchId: "branch-2",
            providerId: "provider-1",
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["availability:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });
  });

  it("creates a valid provider availability rule", async () => {
    const createdRule = {
      id: "rule-1",
      tenantId: "tenant-1",
      branchId: "branch-1",
      providerId: "provider-1",
      resourceId: null,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    };

    vi.mocked(createAvailabilityRule).mockResolvedValue(createdRule);

    const response = createResponse();

    await handleCreateAvailabilityRule(
      createRequest(
        "POST",
        "/api/v1/availability-rules",
        JSON.stringify({
          providerId: "provider-1",
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        }),
      ),
      response,
      {} as never,
      createContext(["availability:manage"], "branch-1"),
    );

    expect(createAvailabilityRule).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-1",
        branchId: "branch-1",
        providerId: "provider-1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        userId: "user-1",
      }),
    );
  });
});
