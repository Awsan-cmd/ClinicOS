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
      // no applicable booking rule
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
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

      const auditCall = pool.client.query.mock.calls[7]!;

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

  it("rejects appointment creation when minimum notice is not satisfied", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T10:00:00.000Z"));

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
      // applicable booking rule: 60 minutes minimum notice
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "rule-1",
            tenantId: "tenant-1",
            branchId: "branch-1",
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentTypeId: null,
            resourceId: null,
            advanceBookingDays: 30,
            minimumNoticeMinutes: 60,
            isActive: true,
            createdAt: new Date("2026-09-01T09:00:00.000Z"),
          },
        ],
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
          startsAt: "2026-09-01T10:30:00.000Z",
          endsAt: "2026-09-01T11:00:00.000Z",
        }),
      });

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
            message:
              "The appointment time does not satisfy the applicable booking rule.",
          },
        },
      });

      expect(pool.client.query).toHaveBeenCalledTimes(7);
    } finally {
      vi.useRealTimers();
      await stopServer(server);
    }
  });

  it("rejects appointment creation when advance booking limit is exceeded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T10:00:00.000Z"));

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
      // applicable booking rule: 7 days maximum advance booking
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "rule-1",
            tenantId: "tenant-1",
            branchId: "branch-1",
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentTypeId: null,
            resourceId: null,
            advanceBookingDays: 7,
            minimumNoticeMinutes: 60,
            isActive: true,
            createdAt: new Date("2026-09-01T09:00:00.000Z"),
          },
        ],
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
          startsAt: "2026-09-08T10:00:01.000Z",
          endsAt: "2026-09-08T10:30:01.000Z",
        }),
      });

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
            message:
              "The appointment time does not satisfy the applicable booking rule.",
          },
        },
      });

      expect(pool.client.query).toHaveBeenCalledTimes(7);
    } finally {
      vi.useRealTimers();
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

  it("confirms a scheduled appointment and audits the authenticated actor", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      // transition query
      .mockResolvedValueOnce({
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
            status: "confirmed",
            starts_at: new Date("2026-09-02T10:00:00.000Z"),
            ends_at: new Date("2026-09-02T10:30:00.000Z"),
            notes: null,
            created_at: new Date("2026-09-01T12:00:00.000Z"),
            previous_status: "scheduled",
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/confirm`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          appointment: {
            id: "appointment-1",
            status: "confirmed",
          },
        },
      });

      const transitionCall = pool.client.query.mock.calls[1]!;
      expect(transitionCall[0]).toContain(
        "WHERE tenant_id = $1",
      );
      expect(transitionCall[0]).toContain(
        "status = ANY($3::text[])",
      );
      expect(transitionCall[1]).toEqual([
        "tenant-1",
        "appointment-1",
        ["scheduled"],
        "confirmed",
        "branch-1",
      ]);

      const auditCall = pool.client.query.mock.calls[2]!;
      expect(auditCall[0]).toContain(
        "INSERT INTO audit_events",
      );
      expect(auditCall[1]).toEqual(
        expect.arrayContaining([
          "tenant-1",
          "actor-1",
          "branch-1",
          "appointment.confirm",
          "appointment",
          "appointment-1",
        ]),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("rejects lifecycle mutations without appointment:manage", async () => {
    const pool = createAuthenticatedPool("nurse");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/confirm`,
        {
          method: "POST",
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

  it("maps a disallowed appointment transition to conflict", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/confirm`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

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

  it("reschedules a scheduled appointment without changing its status", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "appointment-1",
            tenant_id: "tenant-1",
            branch_id: "branch-1",
            patient_id: "patient-1",
            provider_id: "provider-1",
            service_id: "service-1",
            resource_id: "resource-1",
            appointment_type: "consultation",
            status: "scheduled",
            starts_at: new Date("2026-09-03T11:00:00.000Z"),
            ends_at: new Date("2026-09-03T11:30:00.000Z"),
            notes: "follow-up",
            created_at: new Date("2026-09-01T12:00:00.000Z"),
            previous_status: "scheduled",
            previous_starts_at: new Date("2026-09-02T10:00:00.000Z"),
            previous_ends_at: new Date("2026-09-02T10:30:00.000Z"),
          },
        ],
      })
      // no applicable booking rule
      .mockResolvedValueOnce({
        rowCount: 0,
        rows: [],
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/reschedule`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startsAt: "2026-09-03T11:00:00.000Z",
            endsAt: "2026-09-03T11:30:00.000Z",
          }),
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          appointment: {
            id: "appointment-1",
            status: "scheduled",
            startsAt: "2026-09-03T11:00:00.000Z",
            endsAt: "2026-09-03T11:30:00.000Z",
            patientId: "patient-1",
            providerId: "provider-1",
            serviceId: "service-1",
            resourceId: "resource-1",
          },
        },
      });

      const rescheduleCall = pool.client.query.mock.calls[1]!;
      expect(rescheduleCall[0]).toContain(
        "starts_at = $4::timestamptz",
      );
      expect(rescheduleCall[0]).toContain(
        "ends_at = $5::timestamptz",
      );
      expect(rescheduleCall[1]).toEqual([
        "tenant-1",
        "appointment-1",
        ["scheduled", "confirmed"],
        "2026-09-03T11:00:00.000Z",
        "2026-09-03T11:30:00.000Z",
        "branch-1",
      ]);

      const auditCall = pool.client.query.mock.calls[3]!;
      expect(auditCall[0]).toContain(
        "INSERT INTO audit_events",
      );
      expect(auditCall[1]).toEqual(
        expect.arrayContaining([
          "tenant-1",
          "actor-1",
          "branch-1",
          "appointment.rescheduled",
          "appointment",
          "appointment-1",
        ]),
      );
    } finally {
      await stopServer(server);
    }
  });

  it("rejects rescheduling when minimum notice is not satisfied", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T10:00:00.000Z"));

    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "appointment-1",
            tenant_id: "tenant-1",
            branch_id: "branch-1",
            patient_id: "patient-1",
            provider_id: "provider-1",
            service_id: "service-1",
            resource_id: "resource-1",
            appointment_type: "consultation",
            status: "scheduled",
            starts_at: new Date("2026-09-03T11:00:00.000Z"),
            ends_at: new Date("2026-09-03T11:30:00.000Z"),
            notes: "follow-up",
            created_at: new Date("2026-09-01T12:00:00.000Z"),
            previous_status: "scheduled",
            previous_starts_at: new Date("2026-09-02T10:00:00.000Z"),
            previous_ends_at: new Date("2026-09-02T10:30:00.000Z"),
          },
        ],
      })
      // applicable booking rule: 60 minutes minimum notice
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "rule-1",
            tenantId: "tenant-1",
            branchId: "branch-1",
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentTypeId: null,
            resourceId: null,
            advanceBookingDays: 30,
            minimumNoticeMinutes: 60,
            isActive: true,
            createdAt: new Date("2026-09-01T09:00:00.000Z"),
          },
        ],
      })
      // ROLLBACK
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/reschedule`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startsAt: "2026-09-01T10:30:00.000Z",
            endsAt: "2026-09-01T11:00:00.000Z",
          }),
        },
      );

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
            message:
              "The appointment time does not satisfy the applicable booking rule.",
          },
        },
      });

      expect(pool.client.query).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
      await stopServer(server);
    }
  });

  it("rejects rescheduling when advance booking limit is exceeded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T10:00:00.000Z"));

    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "appointment-1",
            tenant_id: "tenant-1",
            branch_id: "branch-1",
            patient_id: "patient-1",
            provider_id: "provider-1",
            service_id: "service-1",
            resource_id: "resource-1",
            appointment_type: "consultation",
            status: "scheduled",
            starts_at: new Date("2026-09-03T11:00:00.000Z"),
            ends_at: new Date("2026-09-03T11:30:00.000Z"),
            notes: "follow-up",
            created_at: new Date("2026-09-01T12:00:00.000Z"),
            previous_status: "scheduled",
            previous_starts_at: new Date("2026-09-02T10:00:00.000Z"),
            previous_ends_at: new Date("2026-09-02T10:30:00.000Z"),
          },
        ],
      })
      // applicable booking rule: 7 days maximum advance booking
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "rule-1",
            tenantId: "tenant-1",
            branchId: "branch-1",
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentTypeId: null,
            resourceId: null,
            advanceBookingDays: 7,
            minimumNoticeMinutes: 60,
            isActive: true,
            createdAt: new Date("2026-09-01T09:00:00.000Z"),
          },
        ],
      })
      // ROLLBACK
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/reschedule`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startsAt: "2026-09-08T10:00:01.000Z",
            endsAt: "2026-09-08T10:30:01.000Z",
          }),
        },
      );

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "bad_request",
            message:
              "The appointment time does not satisfy the applicable booking rule.",
          },
        },
      });

      expect(pool.client.query).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
      await stopServer(server);
    }
  });

  it("rejects rescheduling when the new start is not before the new end", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/reschedule`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startsAt: "2026-09-03T12:00:00.000Z",
            endsAt: "2026-09-03T11:00:00.000Z",
          }),
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

      expect(pool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("maps appointment creation conflicts to conflict", async () => {
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
      // PostgreSQL exclusion constraint
      .mockRejectedValueOnce(
        Object.assign(
          new Error("conflicting key value violates exclusion constraint"),
          { code: "23P01" },
        ),
      )
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
        body: JSON.stringify(validAppointment),
      });

      expect(response.status).toBe(409);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "conflict",
          },
        },
      });

      expect(pool.client.query).toHaveBeenCalledTimes(7);
    } finally {
      await stopServer(server);
    }
  });

  it("maps appointment reschedule conflicts to conflict", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      // PostgreSQL exclusion constraint during UPDATE
      .mockRejectedValueOnce(
        Object.assign(
          new Error("conflicting key value violates exclusion constraint"),
          { code: "23P01" },
        ),
      )
      // ROLLBACK
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/reschedule`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startsAt: "2026-09-03T10:30:00.000Z",
            endsAt: "2026-09-03T11:30:00.000Z",
          }),
        },
      );

      expect(response.status).toBe(409);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "conflict",
          },
        },
      });

      expect(pool.client.query).toHaveBeenCalledTimes(3);
    } finally {
      await stopServer(server);
    }
  });

  it("maps a disallowed reschedule to conflict", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/reschedule`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            startsAt: "2026-09-03T12:00:00.000Z",
            endsAt: "2026-09-03T12:30:00.000Z",
          }),
        },
      );

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

  it("rejects lifecycle access outside the authenticated branch", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/cancel`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(409);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "conflict",
          },
        },
      });

      const transitionCall = pool.client.query.mock.calls[1]!;
      expect(transitionCall[0]).toContain(
        "branch_id = $5",
      );
      expect(transitionCall[1]![4]).toBe("branch-1");
    } finally {
      await stopServer(server);
    }
  });

  it("cancels a scheduled appointment", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
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
            status: "cancelled",
            starts_at: new Date("2026-09-02T10:00:00.000Z"),
            ends_at: new Date("2026-09-02T10:30:00.000Z"),
            notes: null,
            created_at: new Date("2026-09-01T12:00:00.000Z"),
            previous_status: "scheduled",
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/cancel`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          appointment: {
            id: "appointment-1",
            status: "cancelled",
          },
        },
      });
    } finally {
      await stopServer(server);
    }
  });

  it("marks a scheduled appointment as no-show", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
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
            status: "no_show",
            starts_at: new Date("2026-09-02T10:00:00.000Z"),
            ends_at: new Date("2026-09-02T10:30:00.000Z"),
            notes: null,
            created_at: new Date("2026-09-01T12:00:00.000Z"),
            previous_status: "scheduled",
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/no-show`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          appointment: {
            id: "appointment-1",
            status: "no_show",
          },
        },
      });
    } finally {
      await stopServer(server);
    }
  });

  it("supports completing a scheduled appointment directly", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.client.query
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      })
      .mockResolvedValueOnce({
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
            status: "completed",
            starts_at: new Date("2026-09-02T10:00:00.000Z"),
            ends_at: new Date("2026-09-02T10:30:00.000Z"),
            notes: null,
            created_at: new Date("2026-09-01T12:00:00.000Z"),
            previous_status: "scheduled",
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
      const response = await fetch(
        `${url}/api/v1/appointments/appointment-1/complete`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          appointment: {
            id: "appointment-1",
            status: "completed",
          },
        },
      });
    } finally {
      await stopServer(server);
    }
  });

});
