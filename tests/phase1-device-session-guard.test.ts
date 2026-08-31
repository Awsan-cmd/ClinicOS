import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1I device session enforcement", () => {
  it("contains guard types, contracts and persistence", () => {
    expect(
      existsSync("packages/types/src/device-session-guard.ts"),
    ).toBe(true);
    expect(
      existsSync("packages/contracts/src/device-session-guard.ts"),
    ).toBe(true);
    expect(
      existsSync("packages/db/src/device-session-guard.ts"),
    ).toBe(true);
  });

  it("checks the session by its identity", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("export async function checkDeviceSession");
    expect(source).toContain("WHERE ds.id = $1");
    expect(source).toContain("ds.tenant_id AS session_tenant_id");
    expect(source).toContain("ds.device_id AS session_device_id");
    expect(source).toContain("ds.user_id AS session_user_id");
  });

  it("enforces tenant isolation", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("tenant_mismatch");
    expect(source).toContain("ds.tenant_id AS session_tenant_id");
    expect(source).toContain("row.session_tenant_id !== input.tenantId");
  });

  it("enforces device and user identity", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("identity_mismatch");
    expect(source).toContain("ds.device_id AS session_device_id");
    expect(source).toContain("ds.user_id AS session_user_id");
    expect(source).toContain("row.session_device_id !== input.deviceId");
    expect(source).toContain("row.session_user_id !== input.userId");
  });

  it("rejects revoked and expired sessions", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain('row.session_status !== "active"');
    expect(source).toContain('reason: "session_revoked"');
    expect(source).toContain("row.expires_at");
    expect(source).toContain('reason: "session_expired"');
  });

  it("rejects revoked devices", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("row.device_status !== \"active\"");
    expect(source).toContain('reason: "device_revoked"');
  });

  it("requires active device access", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("da.status = 'active'");
    expect(source).toContain("row.access_status !== \"active\"");
    expect(source).toContain('reason: "device_access_revoked"');
  });

  it("joins access and device records within tenant scope", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("d.tenant_id = ds.tenant_id");
    expect(source).toContain("da.tenant_id = ds.tenant_id");
    expect(source).toContain("da.device_id = ds.device_id");
    expect(source).toContain("da.user_id = ds.user_id");
  });



  it("distinguishes tenant mismatch from missing session", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain('reason: "tenant_mismatch"');
    expect(source).toContain("session_tenant_id");
    expect(source).toContain("input.tenantId");
  });

  it("distinguishes identity mismatch from missing session", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain('reason: "identity_mismatch"');
    expect(source).toContain("session_device_id");
    expect(source).toContain("session_user_id");
    expect(source).toContain("input.deviceId");
    expect(source).toContain("input.userId");
  });

  it("keeps missing sessions distinguishable from existing sessions", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain('reason: "session_not_found"');
    expect(source).toContain("result.rowCount !== 1");
  });

  it("returns a positive authorization result only after all checks", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("allowed: true");
    expect(source).toContain("tenantId: row.session_tenant_id");
    expect(source).toContain("deviceId: row.session_device_id");
    expect(source).toContain("userId: row.session_user_id");
    expect(source).toContain("sessionId: row.id");
  });
});
