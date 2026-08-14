import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../config.js";
import { createPool, withTransaction } from "../db.js";

const config = loadConfig();
const pool = createPool(config);
const migrationDirectory = fileURLToPath(new URL("../../migrations/", import.meta.url));

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const alreadyApplied = await pool.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1) AS exists",
      [file],
    );
    if (alreadyApplied.rows[0]?.exists === true) {
      continue;
    }

    const sql = await readFile(new URL(`../../migrations/${file}`, import.meta.url), "utf8");
    await withTransaction(pool, async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
    });
    console.info(`Applied migration ${file}`);
  }
} finally {
  await pool.end();
}
