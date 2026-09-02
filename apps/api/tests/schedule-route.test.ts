import { describe, expect, it, vi } from "vitest";

import {
  handleCreateHoliday,
  handleCreateScheduleBreak,
  handleCreateWorkingHours,
  handleHolidays,
  handleScheduleBreaks,
  handleWorkingHours,
} from "../src/routes/schedule.js";

import { requirePermission } from "../src/authorization.js";
import {
  createHoliday,
  createScheduleBreak,
  createWorkingHours,
  findHolidays,
  findScheduleBreaks,
  findWorkingHours,
} from "@clinicos/db/schedule";

vi.mock("../src/authorization.js", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@clinicos/db/schedule", () => ({
  createHoliday: vi.fn(),
  createScheduleBreak: vi.fn(),
  createWorkingHours: vi.fn(),
  findHolidays: vi.fn(),
  findScheduleBreaks: vi.fn(),
  findWorkingHours: vi.fn(),
}));

function createRequest(
  method = "GET",
  url = "/api/v1/working-hours",
  body = "",
) {
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      if (body) {
        yield Buffer.from(body);
      }
    },
  } as never;
}

function createResponse() {
  const response = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      response.headers[name] = value;
    },
    end: vi.fn(),
  };

  return response as never;
}

function createContext(
  permissions: string[] = [
    "working_hours:read",
    "working_hours:manage",
    "schedule_break:read",
    "schedule_break:manage",
    "holiday:read",
    "holiday:manage",
  ],
  branchId?: string,
) {
  return {
    requestId: "request-1",
    correlationId: "correlation-1",
    authenticatedUser: {
      identity: {
        userId: "user-1",
        tenantId: "tenant-1",
      },
      context: {
        branchId,
      },
      permissions,
    },
  } as never;
}

describe("schedule routes", () => {
  it("requires working_hours:read when listing working hours", async () => {
    const context = createContext(["working_hours:read"]);

    await handleWorkingHours(
      createRequest(),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "working_hours:read",
    );
  });

  it("lists working hours using authenticated tenant and branch context", async () => {
    vi.mocked(findWorkingHours).mockResolvedValue([
      {
        id: "hours-1",
        tenantId: "tenant-1",
        branchId: "branch-1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
    ]);

    await handleWorkingHours(
      createRequest(
        "GET",
        "/api/v1/working-hours?branchId=branch-1",
      ),
      createResponse(),
      {} as never,
      createContext(["working_hours:read"], "branch-1"),
    );

    expect(findWorkingHours).toHaveBeenCalledWith(
      expect.anything(),
      {
        tenantId: "tenant-1",
        branchId: "branch-1",
      },
    );
  });

  it("requires working_hours:manage when creating working hours", async () => {
    const context = createContext(["working_hours:manage"], "branch-1");

    vi.mocked(createWorkingHours).mockResolvedValue({
      id: "hours-1",
      tenantId: "tenant-1",
      branchId: "branch-1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateWorkingHours(
      createRequest(
        "POST",
        "/api/v1/working-hours",
        JSON.stringify({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        }),
      ),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "working_hours:manage",
    );
  });

  it("requires branchId when creating working hours without branch context", async () => {
    await expect(
      handleCreateWorkingHours(
        createRequest(
          "POST",
          "/api/v1/working-hours",
          JSON.stringify({
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["working_hours:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects invalid working hours dayOfWeek", async () => {
    await expect(
      handleCreateWorkingHours(
        createRequest(
          "POST",
          "/api/v1/working-hours",
          JSON.stringify({
            dayOfWeek: 7,
            startTime: "09:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["working_hours:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects invalid working hours time format", async () => {
    await expect(
      handleCreateWorkingHours(
        createRequest(
          "POST",
          "/api/v1/working-hours",
          JSON.stringify({
            dayOfWeek: 1,
            startTime: "9:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["working_hours:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects a working hours start time that is not earlier than end time", async () => {
    await expect(
      handleCreateWorkingHours(
        createRequest(
          "POST",
          "/api/v1/working-hours",
          JSON.stringify({
            dayOfWeek: 1,
            startTime: "17:00",
            endTime: "09:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["working_hours:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects a working hours branch outside authenticated branch context", async () => {
    await expect(
      handleCreateWorkingHours(
        createRequest(
          "POST",
          "/api/v1/working-hours",
          JSON.stringify({
            branchId: "branch-2",
            dayOfWeek: 1,
            startTime: "09:00",
            endTime: "17:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["working_hours:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });
  });

  it("creates valid working hours", async () => {
    vi.mocked(createWorkingHours).mockResolvedValue({
      id: "hours-1",
      tenantId: "tenant-1",
      branchId: "branch-1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateWorkingHours(
      createRequest(
        "POST",
        "/api/v1/working-hours",
        JSON.stringify({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        }),
      ),
      createResponse(),
      {} as never,
      createContext(["working_hours:manage"], "branch-1"),
    );

    expect(createWorkingHours).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-1",
        branchId: "branch-1",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
        userId: "user-1",
      }),
    );
  });

  it("requires schedule_break:read when listing schedule breaks", async () => {
    const context = createContext(["schedule_break:read"]);

    await handleScheduleBreaks(
      createRequest(
        "GET",
        "/api/v1/schedule-breaks",
      ),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "schedule_break:read",
    );
  });

  it("lists schedule breaks using authenticated tenant and branch context", async () => {
    vi.mocked(findScheduleBreaks).mockResolvedValue([
      {
        id: "break-1",
        tenantId: "tenant-1",
        branchId: "branch-1",
        dayOfWeek: 1,
        startTime: "12:00",
        endTime: "13:00",
        isActive: true,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
    ]);

    await handleScheduleBreaks(
      createRequest(
        "GET",
        "/api/v1/schedule-breaks?branchId=branch-1",
      ),
      createResponse(),
      {} as never,
      createContext(["schedule_break:read"], "branch-1"),
    );

    expect(findScheduleBreaks).toHaveBeenCalledWith(
      expect.anything(),
      {
        tenantId: "tenant-1",
        branchId: "branch-1",
      },
    );
  });

  it("requires schedule_break:manage when creating a schedule break", async () => {
    const context = createContext(["schedule_break:manage"], "branch-1");

    vi.mocked(createScheduleBreak).mockResolvedValue({
      id: "break-1",
      tenantId: "tenant-1",
      branchId: "branch-1",
      dayOfWeek: 1,
      startTime: "12:00",
      endTime: "13:00",
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateScheduleBreak(
      createRequest(
        "POST",
        "/api/v1/schedule-breaks",
        JSON.stringify({
          dayOfWeek: 1,
          startTime: "12:00",
          endTime: "13:00",
        }),
      ),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "schedule_break:manage",
    );
  });

  it("rejects invalid schedule break time range", async () => {
    await expect(
      handleCreateScheduleBreak(
        createRequest(
          "POST",
          "/api/v1/schedule-breaks",
          JSON.stringify({
            dayOfWeek: 1,
            startTime: "13:00",
            endTime: "12:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["schedule_break:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects a schedule break branch outside authenticated branch context", async () => {
    await expect(
      handleCreateScheduleBreak(
        createRequest(
          "POST",
          "/api/v1/schedule-breaks",
          JSON.stringify({
            branchId: "branch-2",
            dayOfWeek: 1,
            startTime: "12:00",
            endTime: "13:00",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["schedule_break:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });
  });

  it("creates a valid schedule break", async () => {
    vi.mocked(createScheduleBreak).mockResolvedValue({
      id: "break-1",
      tenantId: "tenant-1",
      branchId: "branch-1",
      dayOfWeek: 1,
      startTime: "12:00",
      endTime: "13:00",
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateScheduleBreak(
      createRequest(
        "POST",
        "/api/v1/schedule-breaks",
        JSON.stringify({
          dayOfWeek: 1,
          startTime: "12:00",
          endTime: "13:00",
        }),
      ),
      createResponse(),
      {} as never,
      createContext(["schedule_break:manage"], "branch-1"),
    );

    expect(createScheduleBreak).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-1",
        branchId: "branch-1",
        dayOfWeek: 1,
        startTime: "12:00",
        endTime: "13:00",
        userId: "user-1",
      }),
    );
  });

  it("requires holiday:read when listing holidays", async () => {
    const context = createContext(["holiday:read"]);

    await handleHolidays(
      createRequest(
        "GET",
        "/api/v1/holidays",
      ),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "holiday:read",
    );
  });

  it("lists holidays using authenticated tenant and branch context", async () => {
    vi.mocked(findHolidays).mockResolvedValue([
      {
        id: "holiday-1",
        tenantId: "tenant-1",
        branchId: "branch-1",
        holidayDate: "2026-12-25",
        name: "Holiday",
        isFullDay: true,
        isActive: true,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
    ]);

    await handleHolidays(
      createRequest(
        "GET",
        "/api/v1/holidays?branchId=branch-1",
      ),
      createResponse(),
      {} as never,
      createContext(["holiday:read"], "branch-1"),
    );

    expect(findHolidays).toHaveBeenCalledWith(
      expect.anything(),
      {
        tenantId: "tenant-1",
        branchId: "branch-1",
      },
    );
  });

  it("includes tenant-wide holidays when listing holidays for a branch", async () => {
    vi.mocked(findHolidays).mockResolvedValue([
      {
        id: "holiday-tenant-wide",
        tenantId: "tenant-1",
        branchId: null,
        holidayDate: "2026-12-25",
        name: "Tenant Holiday",
        isFullDay: true,
        isActive: true,
        createdAt: "2026-09-02T00:00:00.000Z",
      },
    ]);

    const response = createResponse();
    const responseEnd = (response as { end: ReturnType<typeof vi.fn> }).end;

    await handleHolidays(
      createRequest(
        "GET",
        "/api/v1/holidays?branchId=branch-1",
      ),
      response,
      {} as never,
      createContext(["holiday:read"], "branch-1"),
    );

    expect(findHolidays).toHaveBeenCalledWith(
      expect.anything(),
      {
        tenantId: "tenant-1",
        branchId: "branch-1",
      },
    );

    expect(responseEnd).toHaveBeenCalledWith(
      expect.stringContaining("holiday-tenant-wide"),
    );
  });

  it("requires holiday:manage when creating a holiday", async () => {
    const context = createContext(["holiday:manage"], "branch-1");

    vi.mocked(createHoliday).mockResolvedValue({
      id: "holiday-1",
      tenantId: "tenant-1",
      branchId: "branch-1",
      holidayDate: "2026-12-25",
      name: "Holiday",
      isFullDay: true,
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateHoliday(
      createRequest(
        "POST",
        "/api/v1/holidays",
        JSON.stringify({
          holidayDate: "2026-12-25",
          name: "Holiday",
        }),
      ),
      createResponse(),
      {} as never,
      context,
    );

    expect(requirePermission).toHaveBeenCalledWith(
      context,
      "holiday:manage",
    );
  });

  it("rejects an invalid holiday date", async () => {
    await expect(
      handleCreateHoliday(
        createRequest(
          "POST",
          "/api/v1/holidays",
          JSON.stringify({
            holidayDate: "2026-02-30",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["holiday:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects an empty holiday date", async () => {
    await expect(
      handleCreateHoliday(
        createRequest(
          "POST",
          "/api/v1/holidays",
          JSON.stringify({
            holidayDate: "",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["holiday:manage"]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "bad_request",
    });
  });

  it("rejects a holiday branch outside authenticated branch context", async () => {
    await expect(
      handleCreateHoliday(
        createRequest(
          "POST",
          "/api/v1/holidays",
          JSON.stringify({
            branchId: "branch-2",
            holidayDate: "2026-12-25",
          }),
        ),
        createResponse(),
        {} as never,
        createContext(["holiday:manage"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });
  });

  it("creates a tenant-wide holiday", async () => {
    vi.mocked(createHoliday).mockResolvedValue({
      id: "holiday-1",
      tenantId: "tenant-1",
      branchId: null,
      holidayDate: "2026-12-25",
      name: "Holiday",
      isFullDay: true,
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateHoliday(
      createRequest(
        "POST",
        "/api/v1/holidays",
        JSON.stringify({
          holidayDate: "2026-12-25",
          name: "Holiday",
        }),
      ),
      createResponse(),
      {} as never,
      createContext(["holiday:manage"]),
    );

    expect(createHoliday).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-1",
        holidayDate: "2026-12-25",
        name: "Holiday",
        userId: "user-1",
      }),
    );
  });

  it("creates a branch holiday within authenticated branch context", async () => {
    vi.mocked(createHoliday).mockResolvedValue({
      id: "holiday-2",
      tenantId: "tenant-1",
      branchId: "branch-1",
      holidayDate: "2026-12-26",
      name: "Branch Holiday",
      isFullDay: false,
      isActive: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    });

    await handleCreateHoliday(
      createRequest(
        "POST",
        "/api/v1/holidays",
        JSON.stringify({
          branchId: "branch-1",
          holidayDate: "2026-12-26",
          name: "Branch Holiday",
          isFullDay: false,
        }),
      ),
      createResponse(),
      {} as never,
      createContext(["holiday:manage"], "branch-1"),
    );

    expect(createHoliday).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: "tenant-1",
        branchId: "branch-1",
        holidayDate: "2026-12-26",
        name: "Branch Holiday",
        isFullDay: false,
        userId: "user-1",
      }),
    );
  });

  it("rejects a branch filter outside authenticated branch context for schedule reads", async () => {
    await expect(
      handleWorkingHours(
        createRequest(
          "GET",
          "/api/v1/working-hours?branchId=branch-2",
        ),
        createResponse(),
        {} as never,
        createContext(["working_hours:read"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });

    await expect(
      handleScheduleBreaks(
        createRequest(
          "GET",
          "/api/v1/schedule-breaks?branchId=branch-2",
        ),
        createResponse(),
        {} as never,
        createContext(["schedule_break:read"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });

    await expect(
      handleHolidays(
        createRequest(
          "GET",
          "/api/v1/holidays?branchId=branch-2",
        ),
        createResponse(),
        {} as never,
        createContext(["holiday:read"], "branch-1"),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "forbidden",
    });
  });
});
