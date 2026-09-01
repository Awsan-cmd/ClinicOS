import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Pool } from "pg";

import { createAuditEvent } from "@clinicos/db/audit";
import { revokeAuthenticatedSession } from "@clinicos/db/sessions";

import type { RequestContext } from "../context.js";
import { ApiError } from "../errors.js";
import { sendJson } from "../http.js";

export function handleMe(
  _request: IncomingMessage,
  response: ServerResponse,
  context: RequestContext,
): void {
  if (!context.authenticatedUser) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authentication is required.",
    );
  }

  sendJson(
    response,
    200,
    {
      user: context.authenticatedUser.identity,
      context: context.authenticatedUser.context,
    },
    context.requestId,
    context.correlationId,
  );
}

export async function handleLogout(
  _request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: RequestContext,
): Promise<void> {
  const authenticatedUser = context.authenticatedUser;

  if (!authenticatedUser) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authentication is required.",
    );
  }

  const revoked = await revokeAuthenticatedSession(pool, {
    sessionId: authenticatedUser.sessionId,
    userId: authenticatedUser.identity.userId,
    tenantId: authenticatedUser.identity.tenantId,
  });

  if (!revoked) {
    throw new ApiError(
      401,
      "unauthorized",
      "Authentication is required.",
    );
  }

  await createAuditEvent(pool, {
    id: randomUUID(),
    tenantId: authenticatedUser.identity.tenantId,
    userId: authenticatedUser.identity.userId,
    ...(authenticatedUser.context.branchId
      ? { branchId: authenticatedUser.context.branchId }
      : {}),
    action: "logout",
    resource: "session",
    resourceId: authenticatedUser.sessionId,
    metadata: {
      requestId: context.requestId,
      correlationId: context.correlationId,
    },
  });

  sendJson(
    response,
    200,
    {
      success: true,
    },
    context.requestId,
    context.correlationId,
  );
}
