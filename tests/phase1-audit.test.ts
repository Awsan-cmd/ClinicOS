import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1 audit foundation", () => {
  it("contains audit types, contracts, migration and persistence helper", () => {
    expect(existsSync("packages/types/src/audit.ts")).toBe(true);
    expect(existsSync("packages/contracts/src/audit.ts")).toBe(true);
    expect(existsSync("packages/db/src/audit.ts")).toBe(true);
    expect(existsSync("database/migrations/0003_audit_events.sql")).toBe(true);
  });

  it("binds audit events to a tenant", () => {
    const migration = readFileSync(
      "database/migrations/0003_audit_events.sql",
      "utf8",
    );

    expect(migration).toContain(
      "tenant_id UUID NOT NULL REFERENCES tenants",
    );
  });

  it("supports optional user and branch attribution", () => {
    const migration = readFileSync(
      "database/migrations/0003_audit_events.sql",
      "utf8",
    );

    expect(migration).toContain(
      "user_id UUID REFERENCES users",
    );
    expect(migration).toContain(
      "branch_id UUID REFERENCES branches",
    );
  });

  it("stores structured metadata as JSONB", () => {
    const migration = readFileSync(
      "database/migrations/0003_audit_events.sql",
      "utf8",
    );

    expect(migration).toContain("metadata JSONB");
  });

  it("creates append-only audit records without update or delete helpers", () => {
    const audit = readFileSync(
      "packages/db/src/audit.ts",
      "utf8",
    );

    expect(audit).toContain("export async function createAuditEvent");
    expect(audit).not.toContain("UPDATE audit_events");
    expect(audit).not.toContain("DELETE FROM audit_events");
  });

  it("indexes tenant and creation time for audit retrieval", () => {
    const migration = readFileSync(
      "database/migrations/0003_audit_events.sql",
      "utf8",
    );

    expect(migration).toContain("audit_events_tenant_id_idx");
    expect(migration).toContain("audit_events_created_at_idx");
  });
});
