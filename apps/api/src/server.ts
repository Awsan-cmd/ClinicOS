import { createDbPool } from "@clinicos/db/client";
import { createApiServer } from "./app.js";

const port = Number(
  process.env.API_PORT ?? process.env.PORT ?? 3000,
);
const host = process.env.HOST ?? "0.0.0.0";

const pool = createDbPool();
const server = createApiServer(pool);

server.listen(port, host, () => {
  console.log(
    JSON.stringify({
      event: "api_started",
      service: "clinicos-api",
      host,
      port,
    }),
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(
    JSON.stringify({
      event: "api_shutdown",
      signal,
    }),
  );

  server.close(async (error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }

    try {
      await pool.end();
    } catch (poolError) {
      console.error(poolError);
      process.exitCode = 1;
    }

    if (!error && process.exitCode !== 1) {
      process.exit(0);
    }
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
