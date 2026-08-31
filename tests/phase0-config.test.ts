import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ClinicOS Phase 0 foundation", () => {
  it("contains required infrastructure configuration", () => {
    expect(existsSync(".env.example")).toBe(true);
    expect(existsSync("docker-compose.yml")).toBe(true);
    expect(existsSync("vitest.config.mts")).toBe(true);
    expect(existsSync(".github/workflows/ci.yml")).toBe(true);
  });
});
