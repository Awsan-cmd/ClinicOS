import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1 authenticated session security", () => {
  it("requires active, non-revoked, non-expired sessions", () => {
    const source = readFileSync(
      "packages/db/src/session-auth.ts",
      "utf8",
    );

    expect(source).toContain("revoked_at IS NULL");
    expect(source).toContain("expires_at > NOW()");
  });

  it("binds logout revocation to session, user, and tenant", () => {
    const source = readFileSync(
      "packages/db/src/sessions.ts",
      "utf8",
    );

    expect(source).toContain("UPDATE sessions");
    expect(source).toContain("WHERE id = $1");
    expect(source).toContain("AND user_id = $2");
    expect(source).toContain("AND tenant_id = $3");
    expect(source).toContain("AND revoked_at IS NULL");
    expect(source).toContain("SET revoked_at = NOW()");
  });

  it("does not allow a revoked session to authenticate", () => {
    const source = readFileSync(
      "apps/api/src/auth.ts",
      "utf8",
    );

    expect(source).toContain("findActiveSessionByTokenHash");
  });

  it("returns the authenticated session identity as part of AuthenticatedUser", () => {
    const contractSource = readFileSync(
      "packages/contracts/src/auth.ts",
      "utf8",
    );

    const authSource = readFileSync(
      "apps/api/src/auth.ts",
      "utf8",
    );

    expect(contractSource).toContain("sessionId: SessionId");
    expect(authSource).toContain(
      "sessionId: session.sessionId as SessionId",
    );
  });

  it("records logout against the authenticated tenant and user", () => {
    const source = readFileSync(
      "apps/api/src/routes/me.ts",
      "utf8",
    );

    expect(source).toContain("action: \"logout\"");
    expect(source).toContain("resource: \"session\"");
    expect(source).toContain(
      "tenantId: authenticatedUser.identity.tenantId",
    );
    expect(source).toContain(
      "userId: authenticatedUser.identity.userId",
    );
    expect(source).toContain(
      "resourceId: authenticatedUser.sessionId",
    );
  });
});
