import { createHash } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { Pool } from "pg";
import type { AuthenticatedUser } from "@clinicos/contracts/auth";
import type { TenantContext } from "@clinicos/contracts/tenant";
import type { UserIdentity } from "@clinicos/types/identity";
import type { BranchId, TenantId, UserId } from "@clinicos/types/tenant";
import { findUserIdentity } from "@clinicos/db/identity";
import { findActiveSessionByTokenHash } from "@clinicos/db/session-auth";
import type { SessionId } from "@clinicos/types/session";

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

export function extractBearerToken(
  headers: IncomingHttpHeaders,
): string | undefined {
  const authorization = headerValue(headers, "authorization");

  if (!authorization) {
    return undefined;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization);

  if (!match) {
    return undefined;
  }

  const token = match[1]?.trim();

  return token || undefined;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function authenticateRequest(
  pool: Pool,
  headers: IncomingHttpHeaders,
): Promise<AuthenticatedUser | undefined> {
  const token = extractBearerToken(headers);

  if (!token) {
    return undefined;
  }

  const tokenHash = hashSessionToken(token);

  const session = await findActiveSessionByTokenHash(
    pool,
    tokenHash,
  );

  if (!session) {
    return undefined;
  }

  const identity = await findUserIdentity(pool, {
    userId: session.userId,
    tenantId: session.tenantId,
  });

  if (!identity) {
    return undefined;
  }

  const userIdentity: UserIdentity = {
    userId: identity.userId as UserId,
    tenantId: identity.tenantId as TenantId,
    email: identity.email,
    role: identity.role,
    isActive: identity.isActive,
  };

  const tenantContext: TenantContext =
    session.branchId === undefined
      ? {
          tenantId: identity.tenantId as TenantId,
        }
      : {
          tenantId: identity.tenantId as TenantId,
          branchId: session.branchId as BranchId,
        };

  return {
    sessionId: session.sessionId as SessionId,
    identity: userIdentity,
    context: tenantContext,
  };
}
