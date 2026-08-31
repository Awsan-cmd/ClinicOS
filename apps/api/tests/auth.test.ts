import { describe, expect, it, vi } from "vitest";
import { createApiServer } from "../src/app.js";

describe("ClinicOS API authentication", () => {
  it("returns 401 when authentication is missing", async () => {
    const pool = {
      query: vi.fn(),
    };

    const server = createApiServer(pool as never);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Could not determine test server address.");
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/me`,
      );

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
  });

  it("authenticates a valid session and returns the user", async () => {
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
        }),
    };

    const server = createApiServer(pool as never);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Could not determine test server address.");
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/me`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(200);

      const body = await response.json();

      expect(body).toMatchObject({
        data: {
          user: {
            userId: "user-1",
            tenantId: "tenant-1",
            email: "doctor@example.com",
            role: "doctor",
            isActive: true,
          },
          context: {
            tenantId: "tenant-1",
            branchId: "branch-1",
          },
        },
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
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
  });
});
