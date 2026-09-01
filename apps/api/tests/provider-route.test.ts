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

describe("Provider API security boundary", () => {
  it("requires authentication", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/providers`);

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

  it("denies provider listing without provider:read", async () => {
    const pool = createAuthenticatedPool("unknown");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/providers`, {
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

  it("denies provider creation without provider:manage", async () => {
    const pool = createAuthenticatedPool("doctor");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/providers`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          staffMemberId: "staff-1",
          providerType: "doctor",
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

  it("lists providers using the authenticated tenant and branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        {
          id: "provider-1",
          tenant_id: "tenant-1",
          staff_member_id: "staff-1",
          provider_type: "doctor",
          specialty: "Family Medicine",
          license_number: "LIC-001",
          created_at: new Date("2026-09-01T10:00:00.000Z"),
        },
        {
          id: "provider-2",
          tenant_id: "tenant-1",
          staff_member_id: "staff-2",
          provider_type: "dentist",
          specialty: null,
          license_number: null,
          created_at: new Date("2026-09-01T09:00:00.000Z"),
        },
      ],
    });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/providers`, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          providers: [
            {
              id: "provider-1",
              tenantId: "tenant-1",
              staffMemberId: "staff-1",
              providerType: "doctor",
              specialty: "Family Medicine",
              licenseNumber: "LIC-001",
            },
            {
              id: "provider-2",
              tenantId: "tenant-1",
              staffMemberId: "staff-2",
              providerType: "dentist",
            },
          ],
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query.mock.calls[2]![0]).toContain(
        "WHERE p.tenant_id = $1",
      );
      expect(pool.query.mock.calls[2]![1]).toEqual([
        "tenant-1",
        "branch-1",
      ]);
    } finally {
      await stopServer(server);
    }
  });

  it("creates provider and records the authenticated actor in the audit event", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      // staff belongs to tenant and branch
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "staff-1" }],
      })
      // provider insert
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "provider-created",
            tenant_id: "tenant-1",
            staff_member_id: "staff-1",
            provider_type: "doctor",
            specialty: "Family Medicine",
            license_number: "LIC-001",
            created_at: new Date("2026-09-01T12:00:00.000Z"),
          },
        ],
      })
      // audit insert
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      })
      // COMMIT
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/providers`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          staffMemberId: "staff-1",
          branchId: "branch-1",
          providerType: "doctor",
          specialty: "Family Medicine",
          licenseNumber: "LIC-001",
        }),
      });

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          provider: {
            id: "provider-created",
            tenantId: "tenant-1",
            staffMemberId: "staff-1",
            providerType: "doctor",
            specialty: "Family Medicine",
            licenseNumber: "LIC-001",
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
          "provider.created",
          "provider",
          "provider-created",
        ]),
      );

      expect(auditCall[1]).not.toEqual(
        expect.arrayContaining(["staff-1"]),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("rejects a staff member from another tenant", async () => {
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
      const response = await fetch(`${url}/api/v1/providers`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          staffMemberId: "foreign-staff",
          providerType: "doctor",
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

  it("rejects a branch outside the authenticated branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/providers`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          staffMemberId: "staff-1",
          branchId: "foreign-branch",
          providerType: "doctor",
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

  it("rejects duplicate provider registration with conflict", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "staff-1" }],
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
      const response = await fetch(`${url}/api/v1/providers`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          staffMemberId: "staff-1",
          providerType: "doctor",
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

  it("rejects an invalid provider type", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/providers`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          staffMemberId: "staff-1",
          providerType: "surgeon",
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
});
