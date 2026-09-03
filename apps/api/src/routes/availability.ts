import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  findAvailability,
} from "@clinicos/db/availability";

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

function readQueryParam(
  request: IncomingMessage,
  name: string,
): string | undefined {
  const url = new URL(
    request.url ?? "/",
    "http://localhost",
  );
  const value = url.searchParams.get(name)?.trim();

  return value || undefined;
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

export async function handleAvailability(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "availability:read");

  const authenticatedUser = requireContextUser(context);

  const branchId = readQueryParam(request, "branchId");
  const providerId = readQueryParam(request, "providerId");
  const serviceId = readQueryParam(request, "serviceId");
  const startDate = readQueryParam(request, "startDate");
  const endDate = readQueryParam(request, "endDate");
  const appointmentTypeId = readQueryParam(
    request,
    "appointmentTypeId",
  );
  const resourceId = readQueryParam(
    request,
    "resourceId",
  );

  if (
    !branchId ||
    !providerId ||
    !serviceId ||
    !startDate ||
    !endDate
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "branchId, providerId, serviceId, startDate and endDate are required.",
    );
  }

  if (
    authenticatedUser.context.branchId &&
    branchId !== authenticatedUser.context.branchId
  ) {
    throw new ApiError(
      403,
      "forbidden",
      "The requested branch is outside the authenticated branch context.",
    );
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new ApiError(
      400,
      "bad_request",
      "startDate and endDate must use YYYY-MM-DD format.",
    );
  }

  if (startDate > endDate) {
    throw new ApiError(
      400,
      "bad_request",
      "startDate must be before or equal to endDate.",
    );
  }

  const availability = await findAvailability(
    pool,
    authenticatedUser.identity.tenantId,
    {
      branchId,
      providerId,
      serviceId,
      startDate,
      endDate,
      ...(appointmentTypeId ? { appointmentTypeId } : {}),
      ...(resourceId ? { resourceId } : {}),
    },
  );

  sendJson(
    response,
    200,
    availability,
    context.requestId,
    context.correlationId,
  );
}
