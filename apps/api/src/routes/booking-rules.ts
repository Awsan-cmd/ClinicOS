import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  createBookingRule,
  findBookingRules,
} from "@clinicos/db/booking-rules";

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

interface BookingRuleCreateBody {
  branchId?: string;
  providerId?: string;
  serviceId?: string;
  appointmentTypeId?: string;
  resourceId?: string;
  advanceBookingDays?: number;
  minimumNoticeMinutes?: number;
  isActive?: boolean;
}

function parseBody(body: string): BookingRuleCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: BookingRuleCreateBody = {};

    if (typeof value.branchId === "string") {
      result.branchId = value.branchId.trim();
    }

    if (typeof value.providerId === "string") {
      result.providerId = value.providerId.trim();
    }

    if (typeof value.serviceId === "string") {
      result.serviceId = value.serviceId.trim();
    }

    if (typeof value.appointmentTypeId === "string") {
      result.appointmentTypeId = value.appointmentTypeId.trim();
    }

    if (typeof value.resourceId === "string") {
      result.resourceId = value.resourceId.trim();
    }

    if (typeof value.advanceBookingDays === "number") {
      result.advanceBookingDays = value.advanceBookingDays;
    }

    if (typeof value.minimumNoticeMinutes === "number") {
      result.minimumNoticeMinutes = value.minimumNoticeMinutes;
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

export async function handleBookingRules(
  _request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "booking_rule:read");

  const authenticatedUser = requireContextUser(context);

  const bookingRules = await findBookingRules(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { bookingRules },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateBookingRule(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "booking_rule:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (
    body.advanceBookingDays !== undefined &&
    (!Number.isInteger(body.advanceBookingDays) ||
      body.advanceBookingDays < 0)
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "advanceBookingDays must be a non-negative integer.",
    );
  }

  if (
    body.minimumNoticeMinutes !== undefined &&
    (!Number.isInteger(body.minimumNoticeMinutes) ||
      body.minimumNoticeMinutes < 0)
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "minimumNoticeMinutes must be a non-negative integer.",
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
    const bookingRule = await createBookingRule(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      ...(branchId ? { branchId } : {}),
      ...(body.providerId ? { providerId: body.providerId } : {}),
      ...(body.serviceId ? { serviceId: body.serviceId } : {}),
      ...(body.appointmentTypeId
        ? { appointmentTypeId: body.appointmentTypeId }
        : {}),
      ...(body.resourceId ? { resourceId: body.resourceId } : {}),
      ...(body.advanceBookingDays !== undefined
        ? { advanceBookingDays: body.advanceBookingDays }
        : {}),
      ...(body.minimumNoticeMinutes !== undefined
        ? { minimumNoticeMinutes: body.minimumNoticeMinutes }
        : {}),
      ...(body.isActive !== undefined
        ? { isActive: body.isActive }
        : {}),
      userId: authenticatedUser.identity.userId,
    });

    sendJson(
      response,
      201,
      { bookingRule },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    const messages = new Map([
      [
        "booking_rule_branch_not_found",
        "The requested branch was not found in this tenant.",
      ],
      [
        "booking_rule_provider_not_found",
        "The requested provider was not found in this tenant.",
      ],
      [
        "booking_rule_service_not_found",
        "The requested service was not found in this tenant.",
      ],
      [
        "booking_rule_appointment_type_not_found",
        "The requested appointment type was not found in this tenant.",
      ],
      [
        "booking_rule_resource_not_found",
        "The requested resource was not found in this tenant.",
      ],
    ]);

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof error.message === "string" &&
      messages.has(error.message)
    ) {
      throw new ApiError(
        404,
        "not_found",
        messages.get(error.message)!,
      );
    }

    throw error;
  }
}
