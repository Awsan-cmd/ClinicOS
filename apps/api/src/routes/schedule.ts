import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  createHoliday,
  createScheduleBreak,
  createWorkingHours,
  findHolidays,
  findScheduleBreaks,
  findWorkingHours,
} from "@clinicos/db/schedule";

import { requirePermission } from "../authorization.js";
import type { RequestContext } from "../context.js";
import { ApiError } from "../errors.js";
import { sendJson } from "../http.js";

function requireContextUser(context: RequestContext) {
  if (!context.authenticatedUser) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authentication is required.",
    );
  }

  return context.authenticatedUser;
}

interface ScheduleCreateBody {
  branchId?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  holidayDate?: string;
  name?: string;
  isFullDay?: boolean;
}

function parseBody(body: string): ScheduleCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: ScheduleCreateBody = {};

    if (typeof value.branchId === "string") {
      result.branchId = value.branchId.trim();
    }

    if (typeof value.dayOfWeek === "number") {
      result.dayOfWeek = value.dayOfWeek;
    }

    if (typeof value.startTime === "string") {
      result.startTime = value.startTime.trim();
    }

    if (typeof value.endTime === "string") {
      result.endTime = value.endTime.trim();
    }

    if (typeof value.isActive === "boolean") {
      result.isActive = value.isActive;
    }

    if (typeof value.holidayDate === "string") {
      result.holidayDate = value.holidayDate.trim();
    }

    if (typeof value.name === "string") {
      result.name = value.name.trim();
    }

    if (typeof value.isFullDay === "boolean") {
      result.isFullDay = value.isFullDay;
    }

    return result;
  } catch {
    throw new ApiError(
      400,
      "bad_request",
      "Request body must be valid JSON.",
    );
  }
}

async function readBody(
  request: IncomingMessage,
): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk),
    );
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseFilter(
  value: string | null,
  fieldName: string,
): string | undefined {
  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ApiError(
      400,
      "bad_request",
      `${fieldName} must not be empty.`,
    );
  }

  return trimmed;
}

function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function assertBranchContext(
  branchId: string | undefined,
  authenticatedBranchId: string | null | undefined,
): void {
  if (
    branchId &&
    authenticatedBranchId &&
    branchId !== authenticatedBranchId
  ) {
    throw new ApiError(
      403,
      "forbidden",
      "The requested branch is outside the authenticated branch context.",
    );
  }
}

export async function handleWorkingHours(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "working_hours:read");

  const authenticatedUser = requireContextUser(context);
  const url = new URL(
    request.url ?? "/",
    "http://localhost",
  );

  const branchId = parseFilter(
    url.searchParams.get("branchId"),
    "branchId",
  );

  assertBranchContext(
    branchId,
    authenticatedUser.context.branchId,
  );

  const effectiveBranchId =
    branchId ??
    authenticatedUser.context.branchId;

  const workingHours = await findWorkingHours(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(effectiveBranchId
      ? { branchId: effectiveBranchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { workingHours },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateWorkingHours(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "working_hours:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (
    body.dayOfWeek === undefined ||
    body.startTime === undefined ||
    body.endTime === undefined
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "dayOfWeek, startTime and endTime are required.",
    );
  }

  if (
    !Number.isInteger(body.dayOfWeek) ||
    body.dayOfWeek < 0 ||
    body.dayOfWeek > 6
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "dayOfWeek must be an integer between 0 and 6.",
    );
  }

  if (
    !isValidTime(body.startTime) ||
    !isValidTime(body.endTime)
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "startTime and endTime must use HH:mm format.",
    );
  }

  if (body.startTime >= body.endTime) {
    throw new ApiError(
      400,
      "bad_request",
      "startTime must be earlier than endTime.",
    );
  }

  assertBranchContext(
    body.branchId,
    authenticatedUser.context.branchId,
  );

  const branchId =
    body.branchId ??
    authenticatedUser.context.branchId;

  if (!branchId) {
    throw new ApiError(
      400,
      "bad_request",
      "branchId is required.",
    );
  }

  try {
    const workingHours = await createWorkingHours(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      branchId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      ...(body.isActive !== undefined
        ? { isActive: body.isActive }
        : {}),
      userId: authenticatedUser.identity.userId,
    });

    sendJson(
      response,
      201,
      { workingHours },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "working_hours_branch_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested branch was not found in this tenant.",
      );
    }

    throw error;
  }
}

export async function handleScheduleBreaks(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "schedule_break:read");

  const authenticatedUser = requireContextUser(context);
  const url = new URL(
    request.url ?? "/",
    "http://localhost",
  );

  const branchId = parseFilter(
    url.searchParams.get("branchId"),
    "branchId",
  );

  assertBranchContext(
    branchId,
    authenticatedUser.context.branchId,
  );

  const effectiveBranchId =
    branchId ??
    authenticatedUser.context.branchId;

  const scheduleBreaks = await findScheduleBreaks(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(effectiveBranchId
      ? { branchId: effectiveBranchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { scheduleBreaks },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateScheduleBreak(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "schedule_break:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (
    body.dayOfWeek === undefined ||
    body.startTime === undefined ||
    body.endTime === undefined
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "dayOfWeek, startTime and endTime are required.",
    );
  }

  if (
    !Number.isInteger(body.dayOfWeek) ||
    body.dayOfWeek < 0 ||
    body.dayOfWeek > 6
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "dayOfWeek must be an integer between 0 and 6.",
    );
  }

  if (
    !isValidTime(body.startTime) ||
    !isValidTime(body.endTime)
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "startTime and endTime must use HH:mm format.",
    );
  }

  if (body.startTime >= body.endTime) {
    throw new ApiError(
      400,
      "bad_request",
      "startTime must be earlier than endTime.",
    );
  }

  assertBranchContext(
    body.branchId,
    authenticatedUser.context.branchId,
  );

  const branchId =
    body.branchId ??
    authenticatedUser.context.branchId;

  if (!branchId) {
    throw new ApiError(
      400,
      "bad_request",
      "branchId is required.",
    );
  }

  try {
    const scheduleBreak = await createScheduleBreak(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      branchId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      ...(body.isActive !== undefined
        ? { isActive: body.isActive }
        : {}),
      userId: authenticatedUser.identity.userId,
    });

    sendJson(
      response,
      201,
      { scheduleBreak },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "schedule_break_branch_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested branch was not found in this tenant.",
      );
    }

    throw error;
  }
}

export async function handleHolidays(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "holiday:read");

  const authenticatedUser = requireContextUser(context);
  const url = new URL(
    request.url ?? "/",
    "http://localhost",
  );

  const branchId = parseFilter(
    url.searchParams.get("branchId"),
    "branchId",
  );

  assertBranchContext(
    branchId,
    authenticatedUser.context.branchId,
  );

  const effectiveBranchId =
    branchId ??
    authenticatedUser.context.branchId;

  const holidays = await findHolidays(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(effectiveBranchId
      ? { branchId: effectiveBranchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { holidays },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateHoliday(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "holiday:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (!body.holidayDate) {
    throw new ApiError(
      400,
      "bad_request",
      "holidayDate is required.",
    );
  }

  if (!isValidDate(body.holidayDate)) {
    throw new ApiError(
      400,
      "bad_request",
      "holidayDate must use YYYY-MM-DD format.",
    );
  }

  assertBranchContext(
    body.branchId,
    authenticatedUser.context.branchId,
  );

  try {
    const holiday = await createHoliday(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      ...(body.branchId
        ? { branchId: body.branchId }
        : {}),
      holidayDate: body.holidayDate,
      ...(body.name !== undefined
        ? { name: body.name }
        : {}),
      ...(body.isFullDay !== undefined
        ? { isFullDay: body.isFullDay }
        : {}),
      ...(body.isActive !== undefined
        ? { isActive: body.isActive }
        : {}),
      userId: authenticatedUser.identity.userId,
    });

    sendJson(
      response,
      201,
      { holiday },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "holiday_branch_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested branch was not found in this tenant.",
      );
    }

    throw error;
  }
}
