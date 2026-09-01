import { describe, expect, it, vi } from "vitest";
import { createApiServer } from "../src/app.js";

function createPool() {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };

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


  it("creates a patient using the authenticated tenant and branch context", async () => {
    const pool = createPool();

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "patient-created",
            tenant_id: "tenant-1",
            branch_id: "branch-1",
            medical_record_number: "MRN-003",
            first_name: "Omar",
            last_name: "Ali",
            date_of_birth: "1985-05-20",
            phone: "555-0003",
            created_at: "2026-09-01T11:00:00.000Z",
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
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          medicalRecordNumber: "MRN-003",
          firstName: "Omar",
          lastName: "Ali",
          dateOfBirth: "1985-05-20",
          phone: "555-0003",
        }),
      });

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          patient: {
            id: "patient-created",
            tenantId: "tenant-1",
            branchId: "branch-1",
            medicalRecordNumber: "MRN-003",
          },
        },
      });

      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(pool.client.query).toHaveBeenNthCalledWith(
        1,
        "BEGIN",
      );
      expect(pool.client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("INSERT INTO patients"),
        expect.arrayContaining([
          expect.any(String),
          "tenant-1",
          "branch-1",
          "MRN-003",
          "Omar",
          "Ali",
          "1985-05-20",
          "555-0003",
        ]),
      );
      expect(pool.client.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("INSERT INTO audit_events"),
        expect.arrayContaining([
          expect.any(String),
          "tenant-1",
          "user-1",
          "branch-1",
          "patient.created",
          "patient",
          "patient-created",
          expect.anything(),
        ]),
      );
      expect(pool.client.query).toHaveBeenNthCalledWith(
        4,
        "COMMIT",
      );
      expect(pool.client.release).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  });

  it("requires patient:manage to create a patient", async () => {
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
              email: "inactive@example.com",
              role: "unknown",
              is_active: false,
            },
          ],
        }),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          medicalRecordNumber: "MRN-004",
          firstName: "Nora",
          lastName: "Saleh",
        }),
      });

      expect(response.status).toBe(403);
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



  it("rejects malformed JSON when creating a patient", async () => {
    const pool = createPool();
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(url, {
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
            message: "Request body must be valid JSON.",
          },
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

  it("rejects missing required patient fields", async () => {
    const pool = createPool();
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          firstName: "Omar",
          lastName: "Ali",
        }),
      });

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
            message: "medicalRecordNumber is required.",
          },
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

  it("rejects invalid patient date of birth", async () => {
    const pool = createPool();
    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          medicalRecordNumber: "MRN-005",
          firstName: "Omar",
          lastName: "Ali",
          dateOfBirth: "2026-02-30",
        }),
      });

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
            message:
              "dateOfBirth must be a valid YYYY-MM-DD date.",
          },
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

  it("maps duplicate patient medical record numbers to conflict", async () => {
    const pool = createPool();

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockRejectedValueOnce({
        code: "23505",
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          medicalRecordNumber: "MRN-001",
          firstName: "Omar",
          lastName: "Ali",
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

      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(pool.client.query).toHaveBeenNthCalledWith(
        1,
        "BEGIN",
      );
      expect(pool.client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("INSERT INTO patients"),
        expect.any(Array),
      );
      expect(pool.client.query).toHaveBeenCalledTimes(3);
      expect(pool.client.query).toHaveBeenNthCalledWith(
        3,
        "ROLLBACK",
      );
      expect(pool.client.release).toHaveBeenCalledTimes(1);
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
