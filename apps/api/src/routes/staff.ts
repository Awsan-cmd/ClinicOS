import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import { createStaff, findStaff } from "@clinicos/db/staff";

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

interface StaffCreateBody {
  userId?: string;
  branchId?: string;
  displayName?: string;
  jobTitle?: string;
  phone?: string;
}

function parseBody(body: string): StaffCreateBody {
  try {
    const value = JSON.parse(body) as Record<string, unknown>;
    const result: StaffCreateBody = {};

    if (typeof value.userId === "string") {
      result.userId = value.userId.trim();
    }

    if (typeof value.branchId === "string") {
      result.branchId = value.branchId.trim();
    }

    if (typeof value.displayName === "string") {
      result.displayName = value.displayName.trim();
    }

    if (typeof value.jobTitle === "string") {
      result.jobTitle = value.jobTitle.trim();
    }

    if (typeof value.phone === "string") {
      result.phone = value.phone.trim();
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

export async function handleStaff(
  _request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "staff:read");

  const authenticatedUser = requireContextUser(context);

  const staff = await findStaff(pool, {
    tenantId: authenticatedUser.identity.tenantId,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
  });

  sendJson(
    response,
    200,
    { staff },
    context.requestId,
    context.correlationId,
  );
}

export async function handleCreateStaff(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  requirePermission(context, "staff:manage");

  const authenticatedUser = requireContextUser(context);
  const body = parseBody(await readBody(request));

  if (!body.userId || !body.displayName) {
    throw new ApiError(
      400,
      "bad_request",
      "userId and displayName are required.",
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
    const staff = await createStaff(pool, {
      id: randomUUID(),
      tenantId: authenticatedUser.identity.tenantId,
      userId: body.userId,
      actorUserId: authenticatedUser.identity.userId,
      ...(branchId ? { branchId } : {}),
      displayName: body.displayName,
      ...(body.jobTitle ? { jobTitle: body.jobTitle } : {}),
      ...(body.phone ? { phone: body.phone } : {}),
    });

    sendJson(
      response,
      201,
      { staff },
      context.requestId,
      context.correlationId,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "staff_user_not_found"
    ) {
      throw new ApiError(
        404,
        "not_found",
        "The requested staff user was not found in this tenant.",
      );
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "staff_branch_not_found"
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
        "The requested user is already registered as staff in this tenant.",
      );
    }

    throw error;
  }
}
