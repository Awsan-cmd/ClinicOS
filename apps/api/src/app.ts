import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createDbPool } from "@clinicos/db/client";
import type { Pool } from "pg";
import { authenticateRequest } from "./auth.js";
import { createRequestContext } from "./context.js";
import { ApiError, toApiError } from "./errors.js";
import { sendError } from "./http.js";
import { handleHealth } from "./routes/health.js";
import { handleMe } from "./routes/me.js";
import {
  handleCreatePatient,
  handlePatients,
} from "./routes/patient-access.js";

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  context: ReturnType<typeof createRequestContext>,
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(
    request.url ?? "/",
    "http://localhost",
  );

  response.setHeader("x-request-id", context.requestId);
  response.setHeader(
    "x-correlation-id",
    context.correlationId,
  );

  if (
    method === "GET" &&
    url.pathname === "/api/v1/health"
  ) {
    handleHealth(request, response, context);
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/v1/patients"
  ) {
    const authenticatedUser = await authenticateRequest(
      pool,
      request.headers,
    );

    if (authenticatedUser) {
      context.authenticatedUser = authenticatedUser;
    }

    await handleCreatePatient(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/patients"
  ) {
    const authenticatedUser = await authenticateRequest(
      pool,
      request.headers,
    );

    if (authenticatedUser) {
      context.authenticatedUser = authenticatedUser;
    }

    await handlePatients(
      request,
      response,
      pool,
      context,
    );
    return;
  }

  if (
    method === "GET" &&
    url.pathname === "/api/v1/me"
  ) {
    const authenticatedUser = await authenticateRequest(
      pool,
      request.headers,
    );

    if (authenticatedUser) {
      context.authenticatedUser = authenticatedUser;
    }

    handleMe(request, response, context);
    return;
  }

  throw new ApiError(
    404,
    "not_found",
    "The requested resource was not found.",
  );
}

export function createApiServer(pool: Pool = createDbPool()) {
  return createServer(async (request, response) => {
    const context = createRequestContext(request.headers);

    try {
      await route(request, response, pool, context);
    } catch (error) {
      const apiError = toApiError(error);

      sendError(
        response,
        apiError.statusCode,
        apiError.code,
        apiError.message,
        context.requestId,
        context.correlationId,
      );
    }
  });
}
