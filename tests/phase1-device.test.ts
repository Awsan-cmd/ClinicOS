import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1F device foundation", () => {
  it("contains device types, contracts, migration and persistence", () => {
    expect(existsSync("packages/types/src/device.ts")).toBe(true);
    expect(existsSync("packages/contracts/src/device.ts")).toBe(true);
    expect(existsSync("packages/db/src/devices.ts")).toBe(true);
    expect(existsSync("database/migrations/0004_devices.sql")).toBe(true);
  });

  it("binds devices to a tenant", () => {
    const migration = readFileSync(
      "database/migrations/0004_devices.sql",
      "utf8",
    );

    expect(migration).toContain(
      "tenant_id UUID NOT NULL REFERENCES tenants",
    );
  });

  it("supports optional branch binding", () => {
    const migration = readFileSync(
      "database/migrations/0004_devices.sql",
      "utf8",
    );

    expect(migration).toContain(
      "branch_id UUID REFERENCES branches",
    );
  });

  it("stores Android identity and capability state", () => {
    const migration = readFileSync(
      "database/migrations/0004_devices.sql",
      "utf8",
    );

    expect(migration).toContain("platform TEXT NOT NULL");
    expect(migration).toContain("android_api_level INTEGER NOT NULL");
    expect(migration).toContain("app_version TEXT NOT NULL");
    expect(migration).toContain("capabilities JSONB");
  });

  it("supports explicit device revocation", () => {
    const migration = readFileSync(
      "database/migrations/0004_devices.sql",
      "utf8",
    );

    const source = readFileSync(
      "packages/db/src/devices.ts",
      "utf8",
    );

    expect(migration).toContain("revoked_at TIMESTAMPTZ");
    expect(source).toContain("export async function revokeDevice");
    expect(source).toContain("status = 'revoked'");
  });

  it("supports device heartbeat state", () => {
    const migration = readFileSync(
      "database/migrations/0004_devices.sql",
      "utf8",
    );

    const source = readFileSync(
      "packages/db/src/devices.ts",
      "utf8",
    );

    expect(migration).toContain("last_heartbeat_at TIMESTAMPTZ");
    expect(migration).toContain("connectivity TEXT");
    expect(source).toContain("export async function heartbeatDevice");
    expect(source).toContain("status = 'active'");
  });

  it("indexes tenant and device status for secure retrieval", () => {
    const migration = readFileSync(
      "database/migrations/0004_devices.sql",
      "utf8",
    );

    expect(migration).toContain("devices_tenant_id_idx");
    expect(migration).toContain("devices_status_idx");
    expect(migration).toContain("devices_tenant_status_idx");
  });
});
