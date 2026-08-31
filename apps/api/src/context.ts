import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { AuthenticatedUser } from "@clinicos/contracts/auth";
import type { TenantContext } from "@clinicos/contracts/tenant";

export interface RequestContext {
  requestId: string;
  correlationId: string;
  tenantContext?: TenantContext;
  authenticatedUser?: AuthenticatedUser;
}

function headerValue(
  headers: IncomingHttpHeaders,
  name: string,
): string | undefined {
  const value = headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function createId(): string {
  return randomUUID();
}

export function createRequestContext(
  headers: IncomingHttpHeaders,
): RequestContext {
  const requestId =
    headerValue(headers, "x-request-id") ?? createId();

  const correlationId =
    headerValue(headers, "x-correlation-id") ?? requestId;

  return {
    requestId,
    correlationId,
  };
}
