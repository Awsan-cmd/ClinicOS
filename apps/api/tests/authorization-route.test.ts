import { describe, expect, it, vi } from "vitest";
import { createApiServer } from "../src/app.js";

function createPool() {
  return {
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
}

async function startServer(pool: object) {
  const server = createApiServer(pool as never);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Could not determine test server address.");
  }

  return {
    server,
    url: `http://127.0.0.1:${address.port}/api/v1/patient-access`,
  };
}

describe("ClinicOS protected API route", () => {
  it("rejects unauthenticated access before permission evaluation", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(url);

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
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  it("authenticates and authorizes a doctor with patient:read", async () => {
    const pool = createPool();
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(url, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        data: {
          authorized: true,
          permission: "patient:read",
        },
      });
      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });
});
