import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1G device access foundation", () => {
  it("contains access types, contracts, migration and persistence", () => {
    expect(existsSync("packages/types/src/device-access.ts")).toBe(true);
    expect(existsSync("packages/contracts/src/device-access.ts")).toBe(true);
    expect(existsSync("packages/db/src/device-access.ts")).toBe(true);
    expect(existsSync("database/migrations/0005_device_access.sql")).toBe(true);
  });

  it("binds device access to tenant, device and user", () => {
    const migration = readFileSync(
      "database/migrations/0005_device_access.sql",
      "utf8",
    );

    expect(migration).toContain(
      "tenant_id UUID NOT NULL REFERENCES tenants",
    );
    expect(migration).toContain(
      "device_id UUID NOT NULL REFERENCES devices",
    );
    expect(migration).toContain(
      "user_id UUID NOT NULL REFERENCES users",
    );
  });

  it("supports optional branch scoping", () => {
    const migration = readFileSync(
      "database/migrations/0005_device_access.sql",
      "utf8",
    );

    expect(migration).toContain(
      "branch_id UUID REFERENCES branches",
    );
  });

  it("supports explicit access revocation", () => {
    const source = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    expect(source).toContain(
      "export async function revokeDeviceAccess",
    );
    expect(source).toContain("status = 'revoked'");
    expect(source).toContain("revoked_at = NOW()");
  });

  it("checks only active access", () => {
    const source = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    expect(source).toContain(
      "export async function hasActiveDeviceAccess",
    );
    expect(source).toContain("status = 'active'");
    expect(source).toContain("tenant_id = $1");
    expect(source).toContain("device_id = $2");
    expect(source).toContain("user_id = $3");
  });

  it("indexes tenant/device and tenant/user access lookups", () => {
    const migration = readFileSync(
      "database/migrations/0005_device_access.sql",
      "utf8",
    );

    expect(migration).toContain("device_access_tenant_device_idx");
    expect(migration).toContain("device_access_tenant_user_idx");
  });

  it("does not expose a general-purpose update helper", () => {
    const source = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    expect(source).toContain("export async function revokeDeviceAccess");
    expect(source).not.toContain("export async function updateDeviceAccess");
  });
});
