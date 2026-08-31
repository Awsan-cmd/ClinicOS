import { describe, expect, it } from "vitest";
import { createApiServer } from "../src/app.js";

describe("ClinicOS API", () => {
  it("returns health status", async () => {
    const server = createApiServer();

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Could not determine test server address.");
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/health`,
        {
          headers: {
            "x-request-id": "test-request-001",
            "x-correlation-id": "test-correlation-001",
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("x-request-id")).toBe(
        "test-request-001",
      );
      expect(response.headers.get("x-correlation-id")).toBe(
        "test-correlation-001",
      );

      await expect(response.json()).resolves.toEqual({
        data: {
          status: "ok",
          service: "clinicos-api",
          version: "v1",
        },
        requestId: "test-request-001",
        correlationId: "test-correlation-001",
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });

  it("returns 404 for an unknown route", async () => {
    const server = createApiServer();

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      server.close();
      throw new Error("Could not determine test server address.");
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/does-not-exist`,
      );

      expect(response.status).toBe(404);

      await expect(response.json()).resolves.toMatchObject({
        data: {
          error: {
            code: "not_found",
            message: "The requested resource was not found.",
          },
        },
      });

      expect(response.headers.get("x-request-id")).toBeTruthy();
      expect(response.headers.get("x-correlation-id")).toBeTruthy();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });
});
