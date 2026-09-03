import { describe, expect, it, vi } from "vitest";

import { createApiServer } from "../src/app.js";

function createAuthenticatedPool(role = "admin") {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };

  return {
    query: vi
      .fn()
      // authenticateRequest -> active session
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "session-1",
            user_id: "actor-1",
            tenant_id: "tenant-1",
            branch_id: "branch-1",
            expires_at: new Date("2030-01-01T00:00:00.000Z"),
          },
        ],
      })
      // authenticateRequest -> user identity
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "actor-1",
            tenant_id: "tenant-1",
            email: "actor@example.com",
            role,
            is_active: true,
          },
        ],
      }),
    connect: vi.fn().mockResolvedValue(client),
    client,
  };
}

async function startServer(pool: object) {
  const server = createApiServer(pool as never);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not determine test server address.");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function stopServer(server: ReturnType<typeof createApiServer>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

describe("Availability API security boundary", () => {
  it("requires authentication", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/availability?branchId=branch-1&providerId=provider-1&serviceId=service-1&startDate=2026-09-02&endDate=2026-09-02`,
      );

      expect(response.status).toBe(401);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "unauthorized",
          },
        },
      });

      expect(pool.query).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("denies availability listing without availability:read", async () => {
    const pool = createAuthenticatedPool("unknown");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/availability?branchId=branch-1&providerId=provider-1&serviceId=service-1&startDate=2026-09-02&endDate=2026-09-02`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(403);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "forbidden",
          },
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
      await stopServer(server);
    }
  });

  it("lists availability using the authenticated tenant and requested availability inputs", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        {
          starts_at: new Date("2026-09-03T09:00:00.000Z"),
          ends_at: new Date("2026-09-03T09:30:00.000Z"),
        },
        {
          starts_at: new Date("2026-09-03T10:00:00.000Z"),
          ends_at: new Date("2026-09-03T10:30:00.000Z"),
        },
      ],
    });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/availability?branchId=branch-1&providerId=provider-1&serviceId=service-1&startDate=2026-09-03&endDate=2026-09-03&appointmentTypeId=appointment-type-1&resourceId=resource-1`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          slots: [
            {
              startsAt: "2026-09-03T09:00:00.000Z",
              endsAt: "2026-09-03T09:30:00.000Z",
            },
            {
              startsAt: "2026-09-03T10:00:00.000Z",
              endsAt: "2026-09-03T10:30:00.000Z",
            },
          ],
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query.mock.calls[2]![1]).toEqual([
        "tenant-1",
        "branch-1",
        "service-1",
        "provider-1",
        "appointment-type-1",
        "resource-1",
        "2026-09-03",
        "2026-09-03",
        "2026-09-03T00:00:00Z",
        "2026-09-03T23:59:59.999Z",
      ]);
    } finally {
      await stopServer(server);
    }
  });


  it("rejects missing required availability inputs", async () => {
    const pool = createAuthenticatedPool("admin");
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/availability?branchId=branch-1&providerId=provider-1&serviceId=service-1&startDate=2026-09-03`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
          },
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
      await stopServer(server);
    }
  });

  it("rejects invalid availability dates", async () => {
    const pool = createAuthenticatedPool("admin");
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/availability?branchId=branch-1&providerId=provider-1&serviceId=service-1&startDate=2026-02-30&endDate=2026-03-01`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
          },
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
      await stopServer(server);
    }
  });

  it("rejects an availability date range whose start is after its end", async () => {
    const pool = createAuthenticatedPool("admin");
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/availability?branchId=branch-1&providerId=provider-1&serviceId=service-1&startDate=2026-09-04&endDate=2026-09-03`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
          },
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
      await stopServer(server);
    }
  });

  it("rejects an availability branch outside the authenticated branch context", async () => {
    const pool = createAuthenticatedPool("admin");
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/availability?branchId=foreign-branch&providerId=provider-1&serviceId=service-1&startDate=2026-09-03&endDate=2026-09-03`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(403);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "forbidden",
          },
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
      await stopServer(server);
    }
  });
});
