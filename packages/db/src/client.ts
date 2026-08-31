import { Pool, type PoolConfig } from "pg";

export function createDbPool(config: PoolConfig = {}): Pool {
  return new Pool({
    host: config.host ?? process.env.POSTGRES_HOST ?? "localhost",
    port: config.port ?? Number(process.env.POSTGRES_PORT ?? 5432),
    database: config.database ?? process.env.POSTGRES_DB ?? "clinicos",
    user: config.user ?? process.env.POSTGRES_USER ?? "clinicos",
    password: config.password ?? process.env.POSTGRES_PASSWORD ?? "clinicos_dev",
    max: config.max ?? 10,
    ...config,
  });
}
