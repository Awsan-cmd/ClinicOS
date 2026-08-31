import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1 foundation", () => {
  it("contains tenancy contracts and database migration", () => {
    expect(existsSync("packages/types/src/tenant.ts")).toBe(true);
    expect(existsSync("packages/contracts/src/tenant.ts")).toBe(true);
    expect(existsSync("packages/config/src/env.ts")).toBe(true);
    expect(existsSync("database/migrations/0001_initial_tenancy.sql")).toBe(true);
  });

  it("enforces tenant ownership on core entities", () => {
    const migration = readFileSync(
      "database/migrations/0001_initial_tenancy.sql",
      "utf8",
    );

    expect(migration).toContain("tenant_id UUID NOT NULL");
    expect(migration).toContain("REFERENCES tenants(id)");
    expect(migration).toContain("UNIQUE (tenant_id, email)");
  });
});
