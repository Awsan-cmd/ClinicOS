import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1 session foundation", () => {
  it("contains session types, contracts, database migration and persistence helpers", () => {
    expect(existsSync("packages/types/src/session.ts")).toBe(true);
    expect(existsSync("packages/contracts/src/session.ts")).toBe(true);
    expect(existsSync("packages/db/src/sessions.ts")).toBe(true);
    expect(existsSync("database/migrations/0002_sessions.sql")).toBe(true);
  });

  it("stores a token hash instead of a raw session token", () => {
    const migration = readFileSync(
      "database/migrations/0002_sessions.sql",
      "utf8",
    );

    expect(migration).toContain("token_hash TEXT");
    expect(migration).not.toContain("token TEXT");
  });

  it("binds sessions to both users and tenants", () => {
    const migration = readFileSync(
      "database/migrations/0002_sessions.sql",
      "utf8",
    );

    expect(migration).toContain("user_id UUID NOT NULL REFERENCES users");
    expect(migration).toContain("tenant_id UUID NOT NULL REFERENCES tenants");
    expect(migration).toContain("expires_at TIMESTAMPTZ NOT NULL");
    expect(migration).toContain("revoked_at TIMESTAMPTZ");
  });

  it("supports explicit session revocation", () => {
    const sessions = readFileSync(
      "packages/db/src/sessions.ts",
      "utf8",
    );

    expect(sessions).toContain("export async function revokeSession");
    expect(sessions).toContain("SET revoked_at = NOW()");
    expect(sessions).toContain("revoked_at IS NULL");
  });
});
