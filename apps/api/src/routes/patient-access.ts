import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { requirePermission } from "../authorization.js";
import type { RequestContext } from "../context.js";
import { sendJson } from "../http.js";

export function handlePatientAccess(
  _request: IncomingMessage,
  response: ServerResponse,
  context: RequestContext,
): void {
  requirePermission(context, "patient:read");

  sendJson(
    response,
    200,
    {
      authorized: true,
      permission: "patient:read",
    },
    context.requestId,
    context.correlationId,
  );
}
