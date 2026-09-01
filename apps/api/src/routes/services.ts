import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  createService,
  findServices,
} from "@clinicos/db/services";

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

interface ServiceCreateBody {
  branchId?: string;
  code?: string;
  name?: string;
  description?: string;
  durationMinutes?: number;
  isActive?: boolean;
}

function parseBody(body: string): ServiceCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: ServiceCreateBody = {};

    if (typeof value.branchId === "string") {
      result.branchId = value.branchId.trim();
    }

    if (typeof value.code === "string") {
      result.code = value.code.trim();
    }

    if (typeof value.name === "string") {
      result.name = value.name.trim();
    }

    if (typeof value.description === "string") {
      result.description = value.description.trim();
    }

    if (typeof value.durationMinutes === "number") {
      result.durationMinutes = value.durationMinutes;
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

export async function handleServices(
  _request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "service:read");

  const authenticatedUser = requireContextUser(context);

  const services = await findServices(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { services },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateService(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "service:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (
    !body.code ||
    !body.name ||
    body.durationMinutes === undefined
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "code, name and durationMinutes are required.",
    );
  }

  if (
    !Number.isInteger(body.durationMinutes) ||
    body.durationMinutes <= 0
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "durationMinutes must be a positive integer.",
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
    const service = await createService(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      ...(branchId ? { branchId } : {}),
      code: body.code,
      name: body.name,
      ...(body.description
        ? { description: body.description }
        : {}),
      durationMinutes: body.durationMinutes,
      ...(body.isActive !== undefined
        ? { isActive: body.isActive }
        : {}),
      userId: authenticatedUser.identity.userId,
    });

    sendJson(
      response,
      201,
      { service },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      error.message === "service_branch_not_found"
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
      "code" in error &&
      error.code === "23505"
    ) {
      throw new ApiError(
        409,
        "conflict",
        "A service with this code already exists in this tenant.",
      );
    }

    throw error;
  }
}
