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

async function stopServer(
  server: ReturnType<typeof createApiServer>,
) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

describe("Resource API security boundary", () => {
  it("requires authentication", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`);

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

  it("denies resource listing without resource:read", async () => {
    const pool = createAuthenticatedPool("unknown");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

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

  it("denies resource creation without resource:manage", async () => {
    const pool = createAuthenticatedPool("doctor");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "ROOM-01",
          name: "Consultation Room 1",
          resourceType: "room",
        }),
      });

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

  it("lists resources using the authenticated tenant and branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        {
          id: "resource-1",
          tenantId: "tenant-1",
          branchId: "branch-1",
          code: "ROOM-01",
          name: "Consultation Room 1",
          resourceType: "room",
          isActive: true,
          createdAt: new Date("2026-09-01T10:00:00.000Z"),
        },
        {
          id: "resource-2",
          tenantId: "tenant-1",
          branchId: "branch-1",
          code: "CHAIR-01",
          name: "Dental Chair 1",
          resourceType: "chair",
          isActive: true,
          createdAt: new Date("2026-09-01T09:00:00.000Z"),
        },
      ],
    });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          resources: [
            {
              id: "resource-1",
              tenantId: "tenant-1",
              branchId: "branch-1",
              code: "ROOM-01",
              name: "Consultation Room 1",
              resourceType: "room",
              isActive: true,
            },
            {
              id: "resource-2",
              tenantId: "tenant-1",
              branchId: "branch-1",
              code: "CHAIR-01",
              name: "Dental Chair 1",
              resourceType: "chair",
              isActive: true,
            },
          ],
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query.mock.calls[2]![0]).toContain(
        "WHERE tenant_id = $1",
      );
      expect(pool.query.mock.calls[2]![1]).toEqual([
        "tenant-1",
        "branch-1",
      ]);
    } finally {
      await stopServer(server);
    }
  });

  it("creates a resource and records the authenticated actor in the audit event", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "branch-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "resource-created",
            tenantId: "tenant-1",
            branchId: "branch-1",
            code: "ROOM-01",
            name: "Consultation Room 1",
            resourceType: "room",
            isActive: true,
            createdAt: new Date("2026-09-01T12:00:00.000Z"),
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "ROOM-01",
          name: "Consultation Room 1",
          resourceType: "room",
          isActive: true,
        }),
      });

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          resource: {
            id: "resource-created",
            tenantId: "tenant-1",
            branchId: "branch-1",
            code: "ROOM-01",
            name: "Consultation Room 1",
            resourceType: "room",
            isActive: true,
          },
        },
      });

      const auditCall = pool.client.query.mock.calls[3]!;

      expect(auditCall[0]).toContain(
        "INSERT INTO audit_events",
      );

      expect(auditCall[1]).toEqual(
        expect.arrayContaining([
          "tenant-1",
          "actor-1",
          "branch-1",
          "resource.created",
          "resource",
          "resource-created",
        ]),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("rejects a branch outside the authenticated branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          branchId: "foreign-branch",
          code: "ROOM-01",
          name: "Consultation Room 1",
          resourceType: "room",
        }),
      });

      expect(response.status).toBe(403);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "forbidden",
          },
        },
      });

      expect(pool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("rejects a branch outside the tenant", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "ROOM-01",
          name: "Consultation Room 1",
          resourceType: "room",
        }),
      });

      expect(response.status).toBe(404);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "not_found",
          },
        },
      });
    } finally {
      await stopServer(server);
    }
  });

  it("rejects duplicate resource code with conflict", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "branch-1" }],
      })
      .mockRejectedValueOnce({
        code: "23505",
      })
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "ROOM-01",
          name: "Consultation Room 1",
          resourceType: "room",
        }),
      });

      expect(response.status).toBe(409);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "conflict",
          },
        },
      });
    } finally {
      await stopServer(server);
    }
  });

  it("rejects invalid resource input", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: "ROOM-01",
          name: "Consultation Room 1",
          resourceType: "invalid",
        }),
      });

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
          },
        },
      });

      expect(pool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("rejects malformed JSON", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/resources`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: "{invalid-json",
      });

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
          },
        },
      });

      expect(pool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });
});
