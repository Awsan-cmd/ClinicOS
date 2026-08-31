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



  it("does not allow touching a session across tenants", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain("WHERE id = $1");
    expect(source).toContain("AND tenant_id = $2");
    expect(source).toContain("AND device_id = $3");
    expect(source).toContain("AND user_id = $4");
  });

  it("does not touch a revoked session", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain("AND status = 'active'");
  });

  it("does not touch an expired session", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain("AND expires_at > NOW()");
  });

  it("does not touch a session after device access is revoked", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain("FROM device_access");
    expect(source).toContain("AND tenant_id = $2");
    expect(source).toContain("AND device_id = $3");
    expect(source).toContain("AND user_id = $4");
    expect(source).toContain("AND status = 'active'");
  });

  it("does not touch a session after the device is revoked", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    expect(source).toContain("FROM devices");
    expect(source).toContain("WHERE id = $3");
    expect(source).toContain("AND tenant_id = $2");
    expect(source).toContain("AND status = 'active'");
  });

  it("checks current authorization state instead of trusting session state alone", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    const touchStart = source.indexOf(
      "export async function touchDeviceSession",
    );
    const touchEnd = source.indexOf(
      "export async function hasActiveDeviceSession",
    );

    expect(touchStart).toBeGreaterThanOrEqual(0);
    expect(touchEnd).toBeGreaterThan(touchStart);

    const touchSource = source.slice(touchStart, touchEnd);

    expect(touchSource).toContain("FROM device_access");
    expect(touchSource).toContain("FROM devices");
    expect(touchSource).toContain("expires_at > NOW()");
  });

  it("checks current authorization state when validating an active session", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    const start = source.indexOf(
      "export async function hasActiveDeviceSession",
    );

    expect(start).toBeGreaterThanOrEqual(0);

    const sessionSource = source.slice(start);

    expect(sessionSource).toContain("FROM device_access");
    expect(sessionSource).toContain("FROM devices");
    expect(sessionSource).toContain("expires_at > NOW()");
  });



  it("rejects session creation when expiresAt is already in the past", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    const start = source.indexOf(
      "export async function createDeviceSession",
    );
    const end = source.indexOf(
      "export async function revokeDeviceSession",
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const createSource = source.slice(start, end);

    expect(createSource).toContain("expires_at");
    expect(createSource).toContain("NOW()");
  });

  it("returns whether device session creation actually inserted a row", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    const start = source.indexOf(
      "export async function createDeviceSession",
    );
    const end = source.indexOf(
      "export async function revokeDeviceSession",
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const createSource = source.slice(start, end);

    expect(createSource).toContain("RETURNING");
    expect(createSource).not.toContain("Promise<void>");
  });

  it("keeps session creation scoped to active authorization", () => {
    const source = readFileSync(
      "packages/db/src/device-session.ts",
      "utf8",
    );

    const start = source.indexOf(
      "export async function createDeviceSession",
    );
    const end = source.indexOf(
      "export async function revokeDeviceSession",
    );

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const createSource = source.slice(start, end);

    expect(createSource).toContain("FROM device_access");
    expect(createSource).toContain("FROM devices");
    expect(createSource).toContain("tenant_id = $2");
    expect(createSource).toContain("device_id = $3");
    expect(createSource).toContain("user_id = $4");
    expect(createSource).toContain("status = 'active'");
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
