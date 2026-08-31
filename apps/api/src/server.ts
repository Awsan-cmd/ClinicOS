import { createApiServer } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const server = createApiServer();

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

function shutdown(signal: string): void {
  console.log(
    JSON.stringify({
      event: "api_shutdown",
      signal,
    }),
  );

  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
      return;
    }

    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
