import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";
import { sendJson } from "../http.js";
import type { RequestContext } from "../context.js";

export function handleHealth(
  _request: IncomingMessage,
  response: ServerResponse,
  context: RequestContext,
): void {
  sendJson(
    response,
    200,
    {
      status: "ok",
      service: "clinicos-api",
      version: "v1",
    },
    context.requestId,
    context.correlationId,
  );
}
