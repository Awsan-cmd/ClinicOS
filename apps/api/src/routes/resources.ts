import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import {
  createResource,
  findResources,
} from "@clinicos/db/calendar";
import type { ResourceType } from "@clinicos/types/calendar";

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

interface ResourceCreateBody {
  branchId?: string;
  code?: string;
  name?: string;
  resourceType?: ResourceType;
  isActive?: boolean;
}

const RESOURCE_TYPES: readonly ResourceType[] = [
  "room",
  "chair",
  "equipment",
  "other",
];

function parseBody(body: string): ResourceCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: ResourceCreateBody = {};

    if (typeof value.branchId === "string") {
      result.branchId = value.branchId.trim();
    }

    if (typeof value.code === "string") {
      result.code = value.code.trim();
    }

    if (typeof value.name === "string") {
      result.name = value.name.trim();
    }

    if (
      typeof value.resourceType === "string" &&
      RESOURCE_TYPES.includes(
        value.resourceType as ResourceType,
      )
    ) {
      result.resourceType =
        value.resourceType as ResourceType;
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

export async function handleResources(
  _request: IncomingMessage,
  response: ServerResponse,
  _pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "resource:read");

  const authenticatedUser = requireContextUser(context);

  const resources = await findResources(_pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { resources },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateResource(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "resource:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (
    !body.code ||
    !body.name ||
    !body.resourceType
  ) {
    throw new ApiError(
      400,
      "bad_request",
      "code, name and resourceType are required.",
    );
  }

  if (!RESOURCE_TYPES.includes(body.resourceType)) {
    throw new ApiError(
      400,
      "bad_request",
      "resourceType must be one of: room, chair, equipment, other.",
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
    const resource = await createResource(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      ...(branchId ? { branchId } : {}),
      code: body.code,
      name: body.name,
      resourceType: body.resourceType,
      ...(body.isActive !== undefined
        ? { isActive: body.isActive }
        : {}),
      userId: authenticatedUser.identity.userId,
    });

    sendJson(
      response,
      201,
      { resource },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      error.message === "resource_branch_not_found"
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
        "A resource with this code already exists in this tenant.",
      );
    }

    throw error;
  }
}
