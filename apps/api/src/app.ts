import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createRequestContext } from "./context.js";
import { ApiError, toApiError } from "./errors.js";
import { sendError } from "./http.js";
import { handleHealth } from "./routes/health.js";

function route(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  const context = createRequestContext(request.headers);
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

  throw new ApiError(
    404,
    "not_found",
    "The requested resource was not found.",
  );
}

export function createApiServer() {
  return createServer((request, response) => {
    const context = createRequestContext(request.headers);

    try {
      route(request, response);
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
