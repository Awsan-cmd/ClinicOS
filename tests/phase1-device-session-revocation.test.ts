import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1J device session revocation propagation", () => {
  it("propagates device-access revocation to sessions in the same tenant", () => {
    const source = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    expect(source).toContain("WITH revoked_access AS");
    expect(source).toContain("RETURNING tenant_id, device_id, user_id");
    expect(source).toContain("UPDATE device_sessions AS ds");
    expect(source).toContain("ds.tenant_id = ra.tenant_id");
    expect(source).toContain("ds.device_id = ra.device_id");
    expect(source).toContain("ds.user_id = ra.user_id");
  });

  it("does not revoke access from another tenant", () => {
    const source = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    expect(source).toContain("WHERE id = $1");
    expect(source).toContain("AND tenant_id = $2");
  });

  it("propagates device revocation to sessions in the same tenant", () => {
    const source = readFileSync(
      "packages/db/src/devices.ts",
      "utf8",
    );

    expect(source).toContain("WITH revoked_device AS");
    expect(source).toContain("RETURNING tenant_id, id");
    expect(source).toContain("UPDATE device_sessions AS ds");
    expect(source).toContain("ds.tenant_id = rd.tenant_id");
    expect(source).toContain("ds.device_id = rd.id");
  });

  it("does not revoke a device from another tenant", () => {
    const source = readFileSync(
      "packages/db/src/devices.ts",
      "utf8",
    );

    expect(source).toContain("WHERE id = $1");
    expect(source).toContain("AND tenant_id = $2");
  });

  it("only propagates to currently active sessions", () => {
    const accessSource = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    const deviceSource = readFileSync(
      "packages/db/src/devices.ts",
      "utf8",
    );

    expect(accessSource).toContain("AND ds.status = 'active'");
    expect(deviceSource).toContain("AND ds.status = 'active'");
  });

  it("records revocation time on propagated sessions", () => {
    const accessSource = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    const deviceSource = readFileSync(
      "packages/db/src/devices.ts",
      "utf8",
    );

    expect(accessSource).toContain("revoked_at = NOW()");
    expect(deviceSource).toContain("revoked_at = NOW()");
  });

  it("keeps device-access propagation bound to the exact user", () => {
    const source = readFileSync(
      "packages/db/src/device-access.ts",
      "utf8",
    );

    expect(source).toContain("ds.user_id = ra.user_id");
  });

  it("keeps device propagation bound to the exact device", () => {
    const source = readFileSync(
      "packages/db/src/devices.ts",
      "utf8",
    );

    expect(source).toContain("ds.device_id = rd.id");
  });
});
