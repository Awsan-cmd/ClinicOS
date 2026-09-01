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
    url: `http://127.0.0.1:${address.port}/api/v1/patients`,
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


  it("reads patients using the authenticated tenant and branch context", async () => {
    const pool = createPool();

    pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        {
          id: "patient-1",
          tenant_id: "tenant-1",
          branch_id: "branch-1",
          medical_record_number: "MRN-001",
          first_name: "Ali",
          last_name: "Hassan",
          date_of_birth: "1990-01-01",
          phone: "555-0001",
          created_at: "2026-09-01T10:00:00.000Z",
        },
        {
          id: "patient-2",
          tenant_id: "tenant-1",
          branch_id: "branch-1",
          medical_record_number: "MRN-002",
          first_name: "Sara",
          last_name: "Ahmed",
          date_of_birth: null,
          phone: null,
          created_at: "2026-09-01T09:00:00.000Z",
        },
      ],
    });

    const { server, url } = await startServer(pool);

    const patientsUrl = url.replace(
      "/api/v1/patients",
      "/api/v1/patients",
    );

    try {
      const response = await fetch(patientsUrl, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          patients: [
            {
              id: "patient-1",
              tenantId: "tenant-1",
              branchId: "branch-1",
              medicalRecordNumber: "MRN-001",
            },
            {
              id: "patient-2",
              tenantId: "tenant-1",
              branchId: "branch-1",
              medicalRecordNumber: "MRN-002",
            },
          ],
        },
      });

      expect(pool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("WHERE tenant_id = $1"),
        ["tenant-1", "branch-1"],
      );
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
