import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  createProvider,
  findProviders,
} from "@clinicos/db/staff";
import type { ProviderType } from "@clinicos/types/staff";

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

interface ProviderCreateBody {
  staffMemberId?: string;
  branchId?: string;
  providerType?: ProviderType;
  specialty?: string;
  licenseNumber?: string;
}

const PROVIDER_TYPES = new Set<ProviderType>([
  "doctor",
  "dentist",
  "nurse",
  "therapist",
  "other",
]);

function parseBody(body: string): ProviderCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: ProviderCreateBody = {};

    if (typeof value.staffMemberId === "string") {
      result.staffMemberId = value.staffMemberId.trim();
    }

    if (typeof value.branchId === "string") {
      result.branchId = value.branchId.trim();
    }

    if (typeof value.providerType === "string") {
      result.providerType = value.providerType.trim() as ProviderType;
    }

    if (typeof value.specialty === "string") {
      result.specialty = value.specialty.trim();
    }

    if (typeof value.licenseNumber === "string") {
      result.licenseNumber = value.licenseNumber.trim();
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

export async function handleProviders(
  _request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "provider:read");

  const authenticatedUser = requireContextUser(context);

  const providers = await findProviders(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { providers },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateProvider(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "provider:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (
    !body.staffMemberId ||
    !body.providerType
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "staffMemberId and providerType are required.",
    );
  }

  if (!PROVIDER_TYPES.has(body.providerType)) {
    throw new ApiError(
      400,
      "bad_request",
      "providerType must be one of: doctor, dentist, nurse, therapist, other.",
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
    const provider = await createProvider(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      staffMemberId: body.staffMemberId,
      actorUserId: authenticatedUser.identity.userId,
      ...(branchId ? { branchId } : {}),
      providerType: body.providerType,
      ...(body.specialty ? { specialty: body.specialty } : {}),
      ...(body.licenseNumber
        ? { licenseNumber: body.licenseNumber }
        : {}),
    });

    sendJson(
      response,
      201,
      { provider },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      error.message === "provider_staff_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested staff member was not found in this tenant or branch context.",
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
        "The requested staff member is already registered as a provider in this tenant.",
      );
    }

    throw error;
  }
}
