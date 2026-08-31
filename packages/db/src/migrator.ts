import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool } from "pg";

export interface Migration {
  id: string;
  filename: string;
  sql: string;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

const MIGRATION_TABLE = "schema_migrations";

export async function ensureMigrationTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function loadMigrations(directory: string): Promise<Migration[]> {
  const filenames = (await readdir(directory))
    .filter((filename) => /^\d+_.+\.sql$/.test(filename))
    .sort();

  return Promise.all(
    filenames.map(async (filename) => ({
      id: filename.replace(/\.sql$/, ""),
      filename,
      sql: await readFile(join(directory, filename), "utf8"),
    })),
  );
}

export async function runMigrations(
  pool: Pool,
  directory: string,
): Promise<MigrationResult> {
  await ensureMigrationTable(pool);

  const migrations = await loadMigrations(directory);
  const appliedResult = await pool.query<{ id: string }>(
    `SELECT id FROM ${MIGRATION_TABLE} ORDER BY id`,
  );

  const appliedIds = new Set(appliedResult.rows.map((row) => row.id));
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      skipped.push(migration.id);
      continue;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO ${MIGRATION_TABLE} (id, filename) VALUES ($1, $2)`,
        [migration.id, migration.filename],
      );
      await client.query("COMMIT");
      applied.push(migration.id);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return { applied, skipped };
}
