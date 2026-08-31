import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { sendJson } from "../http.js";
import type { RequestContext } from "../context.js";
import { ApiError } from "../errors.js";

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
