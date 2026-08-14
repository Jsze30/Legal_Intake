import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db.js";
import { PostgresIntakeStore } from "./intake-store.js";

const config = loadConfig();
const pool = createPool(config);
const intakeStore = new PostgresIntakeStore(pool, config.workerMaxAttempts);
const app = await createApp({ config, pool, intakeStore });

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down API");
  await app.close();
  await pool.end();
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exitCode = 1;
}
