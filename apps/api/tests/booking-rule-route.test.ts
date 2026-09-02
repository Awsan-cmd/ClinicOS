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

async function stopServer(server: ReturnType<typeof createApiServer>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

describe("Booking Rule API security boundary", () => {
  it("requires authentication", async () => {
    const pool = {
      query: vi.fn(),
    };

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(`${url}/api/v1/booking-rules`);

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

  it("denies booking rule listing without booking_rule:read", async () => {
    const pool = createAuthenticatedPool("unknown");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
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

      expect(pool.query).toHaveBeenCalledTimes(2);
    } finally {
      await stopServer(server);
    }
  });

  it("denies booking rule creation without booking_rule:manage", async () => {
    const pool = createAuthenticatedPool("doctor");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            advanceBookingDays: 30,
            minimumNoticeMinutes: 60,
          }),
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

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(server);
    }
  });

  it("lists booking rules using the authenticated tenant and branch context", async () => {
    const pool = createAuthenticatedPool("admin");

    pool.query.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        {
          id: "booking-rule-1",
          tenantId: "tenant-1",
          branchId: "branch-1",
          providerId: "provider-1",
          serviceId: "service-1",
          appointmentTypeId: "appointment-type-1",
          resourceId: "resource-1",
          advanceBookingDays: 30,
          minimumNoticeMinutes: 60,
          isActive: true,
          createdAt: new Date("2026-09-01T10:00:00.000Z"),
        },
        {
          id: "booking-rule-2",
          tenantId: "tenant-1",
          branchId: "branch-1",
          providerId: null,
          serviceId: null,
          appointmentTypeId: null,
          resourceId: null,
          advanceBookingDays: 7,
          minimumNoticeMinutes: 30,
          isActive: true,
          createdAt: new Date("2026-09-01T09:00:00.000Z"),
        },
      ],
    });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
        {
          headers: {
            authorization: "Bearer test-session-token",
          },
        },
      );

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          bookingRules: [
            {
              id: "booking-rule-1",
              tenantId: "tenant-1",
              branchId: "branch-1",
              providerId: "provider-1",
              serviceId: "service-1",
              appointmentTypeId: "appointment-type-1",
              resourceId: "resource-1",
              advanceBookingDays: 30,
              minimumNoticeMinutes: 60,
              isActive: true,
            },
            {
              id: "booking-rule-2",
              tenantId: "tenant-1",
              branchId: "branch-1",
              advanceBookingDays: 7,
              minimumNoticeMinutes: 30,
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

  it("creates a booking rule and records the authenticated actor in the audit event", async () => {
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
        rows: [{ id: "provider-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "service-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "appointment-type-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: "resource-1" }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            id: "booking-rule-created",
            tenantId: "tenant-1",
            branchId: "branch-1",
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentTypeId: "appointment-type-1",
            resourceId: "resource-1",
            advanceBookingDays: 30,
            minimumNoticeMinutes: 60,
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
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentTypeId: "appointment-type-1",
            resourceId: "resource-1",
            advanceBookingDays: 30,
            minimumNoticeMinutes: 60,
            isActive: true,
          }),
        },
      );

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          bookingRule: {
            id: "booking-rule-created",
            tenantId: "tenant-1",
            branchId: "branch-1",
            providerId: "provider-1",
            serviceId: "service-1",
            appointmentTypeId: "appointment-type-1",
            resourceId: "resource-1",
            advanceBookingDays: 30,
            minimumNoticeMinutes: 60,
            isActive: true,
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
          "booking_rule.created",
          "booking_rule",
          "booking-rule-created",
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
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            branchId: "foreign-branch",
            advanceBookingDays: 30,
          }),
        },
      );

      expect(response.status).toBe(403);
      expect(pool.connect).not.toHaveBeenCalled();

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
      })
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            branchId: "branch-1",
            advanceBookingDays: 30,
          }),
        },
      );

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

  it("rejects a provider outside the tenant", async () => {
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
        rowCount: 0,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: null,
        rows: [],
      });

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            providerId: "foreign-provider",
            advanceBookingDays: 30,
          }),
        },
      );

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

  it("rejects invalid booking rule input", async () => {
    const negativeDaysPool = createAuthenticatedPool("admin");
    const { server: negativeDaysServer, url: negativeDaysUrl } =
      await startServer(negativeDaysPool);

    try {
      const response = await fetch(
        `${negativeDaysUrl}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            advanceBookingDays: -1,
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

      expect(negativeDaysPool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(negativeDaysServer);
    }

    const fractionalNoticePool = createAuthenticatedPool("admin");
    const { server: fractionalNoticeServer, url: fractionalNoticeUrl } =
      await startServer(fractionalNoticePool);

    try {
      const response = await fetch(
        `${fractionalNoticeUrl}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            minimumNoticeMinutes: 30.5,
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

      expect(fractionalNoticePool.connect).not.toHaveBeenCalled();
    } finally {
      await stopServer(fractionalNoticeServer);
    }
  });

  it("rejects malformed JSON", async () => {
    const pool = createAuthenticatedPool("admin");

    const { server, url } = await startServer(pool);

    try {
      const response = await fetch(
        `${url}/api/v1/booking-rules`,
        {
          method: "POST",
          headers: {
            authorization: "Bearer test-session-token",
            "content-type": "application/json",
          },
          body: "{invalid-json",
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
});
