import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { requirePermission } from "../authorization.js";
import { ApiError } from "../errors.js";
import type { RequestContext } from "../context.js";
import { sendJson } from "../http.js";
import {
  createPatient,
  findPatients,
} from "@clinicos/db/patients";

export async function handlePatients(
  _request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "patient:read");

  const authenticatedUser = context.authenticatedUser;

  if (!authenticatedUser) {
    throw new Error("Authentication context disappeared.");
  }

  const patients = await findPatients(pool, {
    tenantId: authenticatedUser.context.tenantId,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
  });

  sendJson(
    response,
    200,
    {
      patients,
    },
    context.requestId,
    context.correlationId,
  );
}


async function readJsonBody(
  request: IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk),
    );
  }

  const body = Buffer.concat(chunks).toString("utf8");

  if (!body.trim()) {
    throw new ApiError(
      400,
      "bad_request",
      "Request body is required.",
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(
      400,
      "bad_request",
      "Request body must be valid JSON.",
    );
  }
}

function requiredString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new ApiError(
      400,
      "bad_request",
      `${field} is required.`,
    );
  }

  return value.trim();
}

function optionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(
      400,
      "bad_request",
      `${field} must be a string.`,
    );
  }

  const normalized = value.trim();

  return normalized || undefined;
}

export async function handleCreatePatient(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "patient:manage");

  const authenticatedUser = context.authenticatedUser;

  if (!authenticatedUser) {
    throw new Error("Authentication context disappeared.");
  }

  const body = await readJsonBody(request);

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "Request body must be an object.",
    );
  }

  const input = body as Record<string, unknown>;

  const medicalRecordNumber = requiredString(
    input.medicalRecordNumber,
    "medicalRecordNumber",
  );

  const firstName = requiredString(
    input.firstName,
    "firstName",
  );

  const lastName = requiredString(
    input.lastName,
    "lastName",
  );

  const dateOfBirth = optionalString(
    input.dateOfBirth,
    "dateOfBirth",
  );

  const phone = optionalString(
    input.phone,
    "phone",
  );

  if (dateOfBirth !== undefined) {
    const date = new Date(`${dateOfBirth}T00:00:00.000Z`);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dateOfBirth
    ) {
      throw new ApiError(
        400,
        "bad_request",
        "dateOfBirth must be a valid YYYY-MM-DD date.",
      );
    }
  }

  try {
    const patient = await createPatient(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.context.tenantId,
      userId: authenticatedUser.identity.userId,
      ...(authenticatedUser.context.branchId
        ? { branchId: authenticatedUser.context.branchId }
        : {}),
      medicalRecordNumber,
      firstName,
      lastName,
      ...(dateOfBirth ? { dateOfBirth } : {}),
      ...(phone ? { phone } : {}),
    });

    sendJson(
      response,
      201,
      { patient },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new ApiError(
        409,
        "conflict",
        "A patient with this medical record number already exists in this tenant.",
      );
    }

    throw error;
  }
}
