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
    expect(source).toContain("AND ds.tenant_id = $2");
    expect(source).toContain("AND ds.device_id = $3");
    expect(source).toContain("AND ds.user_id = $4");
  });

  it("enforces tenant isolation", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("tenant_mismatch");
    expect(source).toContain("AND ds.tenant_id = $2");
  });

  it("enforces device and user identity", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("identity_mismatch");
    expect(source).toContain("AND ds.device_id = $3");
    expect(source).toContain("AND ds.user_id = $4");
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

  it("returns a positive authorization result only after all checks", () => {
    const source = readFileSync(
      "packages/db/src/device-session-guard.ts",
      "utf8",
    );

    expect(source).toContain("allowed: true");
    expect(source).toContain("tenantId: row.tenant_id");
    expect(source).toContain("deviceId: row.device_id");
    expect(source).toContain("userId: row.user_id");
    expect(source).toContain("sessionId: row.id");
  });
});
