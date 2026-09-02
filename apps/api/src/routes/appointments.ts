import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  createAppointment,
  findAppointments,
} from "@clinicos/db/appointments";
import type {
  AppointmentStatus,
  AppointmentType,
} from "@clinicos/types/appointment";

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

interface AppointmentCreateBody {
  branchId?: string;
  patientId?: string;
  providerId?: string;
  serviceId?: string;
  resourceId?: string;
  appointmentType?: AppointmentType;
  status?: AppointmentStatus;
  startsAt?: string;
  endsAt?: string;
  notes?: string;
}

function parseBody(body: string): AppointmentCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: AppointmentCreateBody = {};

    if (typeof value.branchId === "string") {
      const branchId = value.branchId.trim();
      if (branchId) {
        result.branchId = branchId;
      }
    }

    if (typeof value.patientId === "string") {
      const patientId = value.patientId.trim();
      if (patientId) {
        result.patientId = patientId;
      }
    }

    if (typeof value.providerId === "string") {
      const providerId = value.providerId.trim();
      if (providerId) {
        result.providerId = providerId;
      }
    }

    if (typeof value.serviceId === "string") {
      const serviceId = value.serviceId.trim();
      if (serviceId) {
        result.serviceId = serviceId;
      }
    }

    if (typeof value.resourceId === "string") {
      const resourceId = value.resourceId.trim();
      if (resourceId) {
        result.resourceId = resourceId;
      }
    }

    if (typeof value.appointmentType === "string") {
      result.appointmentType =
        value.appointmentType as AppointmentType;
    }

    if (typeof value.status === "string") {
      result.status = value.status as AppointmentStatus;
    }

    if (typeof value.startsAt === "string") {
      result.startsAt = value.startsAt.trim();
    }

    if (typeof value.endsAt === "string") {
      result.endsAt = value.endsAt.trim();
    }

    if (typeof value.notes === "string") {
      result.notes = value.notes.trim();
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

function isAppointmentType(
  value: string,
): value is AppointmentType {
  return [
    "standard",
    "follow_up",
    "consultation",
    "procedure",
  ].includes(value);
}

function isAppointmentStatus(
  value: string,
): value is AppointmentStatus {
  return [
    "scheduled",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ].includes(value);
}

export async function handleAppointments(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "appointment:read");

  const authenticatedUser = requireContextUser(context);
  const requestedBranchId = readQueryParam(request, "branchId");

  if (
    requestedBranchId &&
    authenticatedUser.context.branchId &&
    requestedBranchId !== authenticatedUser.context.branchId
  ) {
    throw new ApiError(
      403,
      "forbidden",
      "The requested branch is outside the authenticated branch context.",
    );
  }

  const branchId =
    requestedBranchId ??
    authenticatedUser.context.branchId;
  const patientId = readQueryParam(request, "patientId");
  const providerId = readQueryParam(request, "providerId");
  const resourceId = readQueryParam(request, "resourceId");

  const appointments = await findAppointments(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(branchId ? { branchId } : {}),
    ...(patientId ? { patientId } : {}),
    ...(providerId ? { providerId } : {}),
    ...(resourceId ? { resourceId } : {}),
  });

  sendJson(
    response,
    200,
    { appointments },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateAppointment(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "appointment:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (
    !body.patientId ||
    !body.providerId ||
    !body.serviceId ||
    !body.startsAt ||
    !body.endsAt
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "patientId, providerId, serviceId, startsAt and endsAt are required.",
    );
  }

  if (
    body.appointmentType &&
    !isAppointmentType(body.appointmentType)
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "appointmentType is invalid.",
    );
  }

  if (
    body.status &&
    !isAppointmentStatus(body.status)
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "status is invalid.",
    );
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "startsAt and endsAt must be valid timestamps.",
    );
  }

  if (startsAt >= endsAt) {
    throw new ApiError(
      400,
      "bad_request",
      "startsAt must be before endsAt.",
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
    const appointment = await createAppointment(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      ...(branchId ? { branchId } : {}),
      patientId: body.patientId,
      providerId: body.providerId,
      serviceId: body.serviceId,
      ...(body.resourceId ? { resourceId: body.resourceId } : {}),
      ...(body.appointmentType
        ? { appointmentType: body.appointmentType }
        : {}),
      ...(body.status ? { status: body.status } : {}),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      ...(body.notes ? { notes: body.notes } : {}),
      actorUserId: authenticatedUser.identity.userId,
    });

    sendJson(
      response,
      201,
      { appointment },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    const message =
      typeof error === "object" &&
      error !== null &&
      "message" in error
        ? error.message
        : undefined;

    if (
      message === "appointment_branch_not_found" ||
      message === "appointment_patient_not_found" ||
      message === "appointment_provider_not_found" ||
      message === "appointment_service_not_found" ||
      message === "appointment_resource_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "One or more appointment references were not found in this tenant.",
      );
    }

    throw error;
  }
}
