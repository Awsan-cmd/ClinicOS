import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("ClinicOS Phase 1 database foundation", () => {
  it("contains the database package and migration runner", () => {
    expect(existsSync("packages/db/package.json")).toBe(true);
    expect(existsSync("packages/db/src/client.ts")).toBe(true);
    expect(existsSync("packages/db/src/migrator.ts")).toBe(true);
  });

  it("defines transactional migration tracking", () => {
    const migrator = readFileSync(
      "packages/db/src/migrator.ts",
      "utf8",
    );

    expect(migrator).toContain("CREATE TABLE IF NOT EXISTS");
    expect(migrator).toContain("schema_migrations");
    expect(migrator).toContain("BEGIN");
    expect(migrator).toContain("COMMIT");
    expect(migrator).toContain("ROLLBACK");
  });

  it("keeps migration files ordered and identifiable", () => {
    const migration = readFileSync(
      "database/migrations/0001_initial_tenancy.sql",
      "utf8",
    );

    expect(migration).toContain("CREATE TABLE tenants");
    expect(migration).toContain("CREATE TABLE branches");
    expect(migration).toContain("CREATE TABLE users");

    const devicesMigration = readFileSync(
      "database/migrations/0004_devices.sql",
      "utf8",
    );

    expect(devicesMigration).toContain("CREATE TABLE devices");
  });
});
