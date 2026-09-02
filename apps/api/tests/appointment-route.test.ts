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

const validAppointment = {
  patientId: "patient-1",
  providerId: "provider-1",
  serviceId: "service-1",
  startsAt: "2026-09-02T10:00:00.000Z",
  endsAt: "2026-09-02T10:30:00.000Z",
};

describe("Appointment API security boundary", () => {
  it("requires authentication", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`);

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

  it("denies appointment listing without appointment:read", async () => {
    const pool = createAuthenticatedPool("unknown");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
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

  it("denies appointment creation without appointment:manage", async () => {
    const pool = createAuthenticatedPool("nurse");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify(validAppointment),
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

  it("lists appointments using the authenticated tenant and branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "appointment-1",
          tenant_id: "tenant-1",
          branch_id: "branch-1",
          patient_id: "patient-1",
          provider_id: "provider-1",
          service_id: "service-1",
          resource_id: null,
          appointment_type: "standard",
          status: "scheduled",
          starts_at: new Date("2026-09-02T10:00:00.000Z"),
          ends_at: new Date("2026-09-02T10:30:00.000Z"),
          notes: null,
          created_at: new Date("2026-09-01T12:00:00.000Z"),
        },
      ],
    });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        headers: {
          authorization: "Bearer test-session-token",
        },
      });

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          appointments: [
            {
              id: "appointment-1",
              tenantId: "tenant-1",
              branchId: "branch-1",
              patientId: "patient-1",
              providerId: "provider-1",
              serviceId: "service-1",
              appointmentType: "standard",
              status: "scheduled",
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

  it("rejects listing appointments from outside the authenticated branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/appointments?branchId=foreign-branch`,
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

      expect(pool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("rejects appointment creation with a branch outside the authenticated context", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          branchId: "foreign-branch",
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

  it("rejects missing required appointment fields", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          patientId: "patient-1",
          providerId: "provider-1",
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

  it("rejects invalid appointment type", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          appointmentType: "invalid",
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

  it("rejects invalid appointment status", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          status: "invalid",
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

  it("rejects invalid appointment timestamps", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          startsAt: "not-a-timestamp",
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

  it("rejects an appointment whose start is not before its end", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          startsAt: "2026-09-02T11:00:00.000Z",
          endsAt: "2026-09-02T10:00:00.000Z",
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

  it("creates an appointment and records the authenticated actor in the audit event", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      // branch belongs to tenant
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "branch-1" }],
      })
      // patient belongs to tenant
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "patient-1" }],
      })
      // provider belongs to tenant
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "provider-1" }],
      })
      // service belongs to tenant
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "service-1" }],
      })
      // appointment insert
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "appointment-created",
            tenant_id: "tenant-1",
            branch_id: "branch-1",
            patient_id: "patient-1",
            provider_id: "provider-1",
            service_id: "service-1",
            resource_id: null,
            appointment_type: "standard",
            status: "scheduled",
            starts_at: new Date("2026-09-02T10:00:00.000Z"),
            ends_at: new Date("2026-09-02T10:30:00.000Z"),
            notes: null,
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
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify(validAppointment),
      });

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          appointment: {
            id: "appointment-created",
            tenantId: "tenant-1",
            branchId: "branch-1",
            patientId: "patient-1",
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentType: "standard",
            status: "scheduled",
          },
        },
      });

      const auditCall = pool.client.query.mock.calls[6]!;

      expect(auditCall[0]).toContain(
        "INSERT INTO audit_events",
      );

      expect(auditCall[1]).toEqual(
        expect.arrayContaining([
          "tenant-1",
          "actor-1",
          "branch-1",
          "appointment.created",
          "appointment",
          "appointment-created",
        ]),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("maps a cross-tenant patient reference to not found", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      // branch belongs to tenant
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "branch-1" }],
      })
      // patient does not belong to tenant
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      })
      // ROLLBACK
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          patientId: "foreign-patient",
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

  it("maps a missing provider reference to not found", async () => {
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
        rows: [{ id: "patient-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          providerId: "missing-provider",
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

  it("maps a missing service reference to not found", async () => {
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
        rows: [{ id: "patient-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "provider-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          serviceId: "missing-service",
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

  it("maps a missing resource reference to not found", async () => {
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
        rows: [{ id: "patient-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "provider-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "service-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
        method: "POST",
        headers: {
          authorization: "Bearer test-session-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          ...validAppointment,
          resourceId: "missing-resource",
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

  it("rejects malformed JSON", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/appointments`, {
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
