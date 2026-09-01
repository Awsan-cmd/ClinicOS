import type {
  IncomingMessage,
  ServerResponse,
} from "node:http";
import type { Pool } from "pg";
import { requirePermission } from "../authorization.js";
import type { RequestContext } from "../context.js";
import { sendJson } from "../http.js";
import { findPatients } from "@clinicos/db/patients";

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
