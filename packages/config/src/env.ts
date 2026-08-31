export interface AppConfig {
  nodeEnv: string;
  logLevel: string;
  apiPort: number;
  webPort: number;
  postgresHost: string;
  postgresPort: number;
  redisHost: string;
  redisPort: number;
}

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "info",
    apiPort: Number(process.env.API_PORT ?? 3000),
    webPort: Number(process.env.WEB_PORT ?? 3001),
    postgresHost: process.env.POSTGRES_HOST ?? "localhost",
    postgresPort: Number(process.env.POSTGRES_PORT ?? 5432),
    redisHost: process.env.REDIS_HOST ?? "localhost",
    redisPort: Number(process.env.REDIS_PORT ?? 6379),
  };
}

export { required };
