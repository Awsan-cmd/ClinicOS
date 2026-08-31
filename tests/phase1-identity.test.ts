import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 1 identity foundation", () => {
  it("contains identity and authentication contracts", () => {
    expect(existsSync("packages/types/src/identity.ts")).toBe(true);
    expect(existsSync("packages/contracts/src/auth.ts")).toBe(true);
  });

  it("defines explicit application roles", () => {
    const identity = readFileSync(
      "packages/types/src/identity.ts",
      "utf8",
    );

    expect(identity).toContain('"owner"');
    expect(identity).toContain('"admin"');
    expect(identity).toContain('"manager"');
    expect(identity).toContain('"doctor"');
    expect(identity).toContain('"receptionist"');
    expect(identity).toContain('"nurse"');
  });

  it("keeps authentication bound to tenant context", () => {
    const auth = readFileSync(
      "packages/contracts/src/auth.ts",
      "utf8",
    );

    expect(auth).toContain("AuthenticatedUser");
    expect(auth).toContain("TenantContext");
    expect(auth).toContain("UserIdentity");
  });
});
