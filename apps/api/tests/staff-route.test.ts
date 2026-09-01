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

describe("Staff API security boundary", () => {
  it("requires authentication", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/staff`);

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

  it("denies staff listing without staff:read", async () => {
    const pool = createAuthenticatedPool("unknown");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/staff`, {
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

  it("denies staff creation without staff:manage", async () => {
    const pool = createAuthenticatedPool("doctor");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/staff`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "staff-user-1",
          displayName: "Nurse One",
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

  it("lists staff using the authenticated tenant and branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        {
          id: "staff-1",
          tenant_id: "tenant-1",
          user_id: "user-1",
          branch_id: "branch-1",
          display_name: "Dr. Ali",
          job_title: "Doctor",
          phone: "555-0001",
          created_at: "2026-09-01T10:00:00.000Z",
        },
        {
          id: "staff-2",
          tenant_id: "tenant-1",
          user_id: "user-2",
          branch_id: "branch-1",
          display_name: "Sara",
          job_title: "Nurse",
          phone: null,
          created_at: "2026-09-01T09:00:00.000Z",
        },
      ],
    });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/staff`, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          staff: [
            {
              id: "staff-1",
              tenantId: "tenant-1",
              userId: "user-1",
              branchId: "branch-1",
              displayName: "Dr. Ali",
            },
            {
              id: "staff-2",
              tenantId: "tenant-1",
              userId: "user-2",
              branchId: "branch-1",
              displayName: "Sara",
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

  it("creates staff and records the authenticated actor in the audit event", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      // user belongs to tenant and is active
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "staff-user-1" }],
      })
      // branch belongs to tenant
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "branch-1" }],
      })
      // staff insert
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "staff-created",
            tenant_id: "tenant-1",
            user_id: "staff-user-1",
            branch_id: "branch-1",
            display_name: "Nurse One",
            job_title: "Nurse",
            phone: "555-0100",
            created_at: "2026-09-01T12:00:00.000Z",
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
      const response = await fetch(`${url}/api/v1/staff`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "staff-user-1",
          branchId: "branch-1",
          displayName: "Nurse One",
          jobTitle: "Nurse",
          phone: "555-0100",
        }),
      });

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          staff: {
            id: "staff-created",
            tenantId: "tenant-1",
            userId: "staff-user-1",
            branchId: "branch-1",
            displayName: "Nurse One",
          },
        },
      });

      const auditCall = pool.client.query.mock.calls[4]!;

      expect(auditCall[0]).toContain(
        "INSERT INTO audit_events",
      );

      expect(auditCall[1]).toEqual(
        expect.arrayContaining([
          "tenant-1",
          "actor-1",
          "branch-1",
          "staff.created",
          "staff",
          "staff-created",
        ]),
      );

      expect(auditCall[1]).not.toEqual(
        expect.arrayContaining(["staff-user-1"]),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("rejects a staff user from another tenant", async () => {
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
      const response = await fetch(`${url}/api/v1/staff`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "foreign-user",
          displayName: "Foreign User",
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

  it("rejects a branch from another tenant", async () => {
    const pool = createAuthenticatedPool("owner");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "staff-user-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/staff`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "staff-user-1",
          branchId: "foreign-branch",
          displayName: "Foreign Branch",
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
    } finally {
      await stopServer(server);
    }
  });

  it("rejects a branch outside the authenticated branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/staff`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "staff-user-1",
          branchId: "branch-2",
          displayName: "Wrong Branch",
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

      expect(pool.client.query).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("maps duplicate staff registration to conflict", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "staff-user-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "branch-1" }],
      })
      .mockRejectedValueOnce(
        Object.assign(new Error("duplicate"), {
          code: "23505",
        }),
      )
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/staff`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userId: "staff-user-1",
          branchId: "branch-1",
          displayName: "Duplicate",
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
});
