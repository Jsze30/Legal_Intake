import pg from "pg";
import type { AppConfig } from "./config.js";

const { Pool } = pg;

export type DatabasePool = pg.Pool;
export type DatabaseClient = pg.PoolClient;

export function createPool(config: AppConfig): DatabasePool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...(config.databaseSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  });
}

export async function withTransaction<T>(
  pool: DatabasePool,
  operation: (client: DatabaseClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
