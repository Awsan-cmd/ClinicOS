import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1H device session foundation", () => {
  it("contains session types, contracts, migration and persistence", () => {
    expect(existsSync("packages/types/src/device-session.ts")).toBe(true);
    expect(existsSync("packages/contracts/src/device-session.ts")).toBe(true);
    expect(existsSync("packages/db/src/device-session.ts")).toBe(true);
    expect(existsSync("database/migrations/0006_device_sessions.sql")).toBe(true);
  });

  it("binds sessions to tenant, device and user", () => {
    const migration = readFileSync(
      "database/migrations/0006_device_sessions.sql",
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

  it("stores session lifecycle and expiry state", () => {
    const migration = readFileSync(
      "database/migrations/0006_device_sessions.sql",
      "utf8",
    );

    expect(migration).toContain("status TEXT NOT NULL DEFAULT 'active'");
    expect(migration).toContain("expires_at TIMESTAMPTZ NOT NULL");
    expect(migration).toContain("last_seen_at TIMESTAMPTZ NOT NULL");
    expect(migration).toContain("revoked_at TIMESTAMPTZ");
  });

  it("creates sessions only for active device access and active devices", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain("export async function createDeviceSession");
    expect(source).toContain("FROM device_access");
    expect(source).toContain("status = 'active'");
    expect(source).toContain("FROM devices");
  });

  it("supports explicit session revocation", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain(
      "export async function revokeDeviceSession",
    );
    expect(source).toContain("status = 'revoked'");
    expect(source).toContain("revoked_at = NOW()");
    expect(source).toContain("AND tenant_id = $2");
  });

  it("touches only active, non-expired sessions with active access", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain(
      "export async function touchDeviceSession",
    );
    expect(source).toContain("status = 'active'");
    expect(source).toContain("expires_at > NOW()");
    expect(source).toContain("FROM device_access");
    expect(source).toContain("FROM devices");
  });

  it("checks tenant, device, user and session identity", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain(
      "export async function hasActiveDeviceSession",
    );
    expect(source).toContain("id = $1");
    expect(source).toContain("tenant_id = $2");
    expect(source).toContain("device_id = $3");
    expect(source).toContain("user_id = $4");
    expect(source).toContain("LIMIT 1");
  });

  it("indexes tenant/device and tenant/user session lookups", () => {
    const migration = readFileSync(
      "database/migrations/0006_device_sessions.sql",
      "utf8",
    );

    expect(migration).toContain("device_sessions_tenant_device_idx");
    expect(migration).toContain("device_sessions_tenant_user_idx");
    expect(migration).toContain("device_sessions_expires_at_idx");
  });

  it("does not expose a general-purpose session update helper", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).not.toContain(
      "export async function updateDeviceSession",
    );
  });
});
