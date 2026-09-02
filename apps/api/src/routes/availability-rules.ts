import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  createAvailabilityRule,
  findAvailabilityRules,
} from "@clinicos/db/calendar";

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

interface AvailabilityRuleCreateBody {
  branchId?: string;
  providerId?: string;
  resourceId?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

function parseBody(body: string): AvailabilityRuleCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: AvailabilityRuleCreateBody = {};

    if (typeof value.branchId === "string") {
      result.branchId = value.branchId.trim();
    }

    if (typeof value.providerId === "string") {
      const providerId = value.providerId.trim();

      if (providerId) {
        result.providerId = providerId;
      }
    }

    if (typeof value.resourceId === "string") {
      const resourceId = value.resourceId.trim();

      if (resourceId) {
        result.resourceId = resourceId;
      }
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

export async function handleAvailabilityRules(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "availability:read");

  const authenticatedUser = requireContextUser(context);
  const url = new URL(
    request.url ?? "/",
    "http://localhost",
  );

  const branchId = parseFilter(
    url.searchParams.get("branchId"),
    "branchId",
  );

  const providerId = parseFilter(
    url.searchParams.get("providerId"),
    "providerId",
  );

  const resourceId = parseFilter(
    url.searchParams.get("resourceId"),
    "resourceId",
  );

  if (
    branchId &&
    authenticatedUser.context.branchId &&
    branchId !== authenticatedUser.context.branchId
  ) {
    throw new ApiError(
      403,
      "forbidden",
      "The requested branch is outside the authenticated branch context.",
    );
  }

  const effectiveBranchId =
    branchId ??
    authenticatedUser.context.branchId;

  const rules = await findAvailabilityRules(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(effectiveBranchId
      ? { branchId: effectiveBranchId }
      : {}),
    ...(providerId ? { providerId } : {}),
    ...(resourceId ? { resourceId } : {}),
  });

  sendJson(
    response,
    200,
    { availabilityRules: rules },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateAvailabilityRule(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "availability:manage");

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
    body.providerId === undefined &&
    body.resourceId === undefined
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "providerId or resourceId is required.",
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

  if (
    body.branchId &&
    authenticatedUser.context.branchId &&
    body.branchId !== authenticatedUser.context.branchId
  ) {
    throw new ApiError(
      403,
      "forbidden",
      "The requested branch is outside the authenticated branch context.",
    );
  }

  const branchId =
    body.branchId ??
    authenticatedUser.context.branchId;

  try {
    const rule = await createAvailabilityRule(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(body.providerId
        ? { providerId: body.providerId }
        : {}),
      ...(body.resourceId
        ? { resourceId: body.resourceId }
        : {}),
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
      { availabilityRule: rule },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      error.message === "availability_rule_branch_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested branch was not found in this tenant.",
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      error.message === "availability_rule_provider_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested provider was not found in this tenant.",
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      error.message === "availability_rule_resource_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested resource was not found in this tenant.",
      );
    }

    throw error;
  }
}
