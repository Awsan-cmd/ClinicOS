import { describe, expect, it, vi } from "vitest";

import { createApiServer } from "../src/app.js";

describe("POST /api/v1/logout", () => {
  async function startServer(pool: { query: ReturnType<typeof vi.fn> }) {
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
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  it("requires authentication", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/logout`, {
        method: "POST",
      });

      expect(response.status).toBe(401);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "unauthorized",
            message: "Authentication is required.",
          },
        },
      });

      expect(pool.query).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("revokes the authenticated session and records a logout audit event", async () => {
    const pool = {
      query: vi.fn()
        // authenticateRequest -> findActiveSessionByTokenHash
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "session-1",
              user_id: "user-1",
              tenant_id: "tenant-1",
              branch_id: "branch-1",
              expires_at: new Date("2030-01-01T00:00:00.000Z"),
            },
          ],
        })
        // authenticateRequest -> findUserIdentity
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "user-1",
              tenant_id: "tenant-1",
              email: "doctor@example.com",
              role: "doctor",
              is_active: true,
            },
          ],
        })
        // logout -> revokeAuthenticatedSession
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [],
        })
        // logout -> createAuditEvent
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [],
        }),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/logout`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          success: true,
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(4);

      const revokeCall = pool.query.mock.calls[2]!;
      expect(revokeCall).toBeDefined();

      expect(revokeCall[0]).toContain("UPDATE sessions");
      expect(revokeCall[0]).toContain("WHERE id = $1");
      expect(revokeCall[0]).toContain("AND user_id = $2");
      expect(revokeCall[0]).toContain("AND tenant_id = $3");
      expect(revokeCall[0]).toContain("AND revoked_at IS NULL");

      expect(revokeCall[1]).toEqual([
        "session-1",
        "user-1",
        "tenant-1",
      ]);

      const auditCall = pool.query.mock.calls[3]!;
      expect(auditCall).toBeDefined();

      expect(auditCall[0]).toContain("INSERT INTO audit_events");

      expect(auditCall[1]).toEqual(
        expect.arrayContaining([
          "tenant-1",
          "user-1",
          "branch-1",
          "logout",
          "session",
          "session-1",
        ]),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("invalidates the session so it cannot authenticate again", async () => {
    const pool = {
      query: vi.fn()
        // First request: authenticate before logout.
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "session-1",
              user_id: "user-1",
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
              id: "user-1",
              tenant_id: "tenant-1",
              email: "doctor@example.com",
              role: "doctor",
              is_active: true,
            },
          ],
        })
        // Logout: revoke the session.
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [],
        })
        // Logout: audit event.
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [],
        })
        // Second request: the revoked session is no longer active.
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: [],
        }),
    };

    const { server, url } = await startServer(pool);

    try {
      const logoutResponse = await fetch(`${url}/api/v1/logout`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(logoutResponse.status).toBe(200);

      const meResponse = await fetch(`${url}/api/v1/me`, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(meResponse.status).toBe(401);

      await expect(meResponse.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "unauthorized",
            message: "Authentication is required.",
          },
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(5);
    } finally {
      await stopServer(server);
    }
  });

  it("does not report success when the authenticated session cannot be revoked", async () => {
    const pool = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [
            {
              id: "session-1",
              user_id: "user-1",
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
              id: "user-1",
              tenant_id: "tenant-1",
              email: "doctor@example.com",
              role: "doctor",
              is_active: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          rowCount: 0,
          rows: [],
        }),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/logout`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(401);

      expect(pool.query).toHaveBeenCalledTimes(3);
    } finally {
      await stopServer(server);
    }
  });
});
