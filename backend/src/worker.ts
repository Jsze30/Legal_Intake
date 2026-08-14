import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { loadConfig } from "./config.js";
import { createPool } from "./db.js";
import { OpenAiIntakeExtractor } from "./extractor.js";
import { ExtractionJobStore } from "./intake-store.js";

const config = loadConfig();
if (config.openAiApiKey === undefined) {
  throw new Error("OPENAI_API_KEY is required to run the extraction worker");
}

const pool = createPool(config);
const jobStore = new ExtractionJobStore(pool, config.workerJobTimeoutSeconds);
const extractor = new OpenAiIntakeExtractor(config.openAiApiKey, config.openAiModel);
const workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
let shuttingDown = false;

process.once("SIGINT", () => {
  shuttingDown = true;
});
process.once("SIGTERM", () => {
  shuttingDown = true;
});

console.info("Extraction worker started", { workerId, model: extractor.model });

while (!shuttingDown) {
  const job = await jobStore.claimNext(workerId);
  if (job === null) {
    await delay(config.workerPollIntervalMs);
    continue;
  }

  console.info("Extraction job claimed", {
    jobId: job.id,
    intakeId: job.intakeId,
    attempt: job.attempts,
  });

  try {
    const extraction = await extractor.extract(job.transcript);
    await jobStore.complete(job, extraction, extractor.model);
    console.info("Extraction job completed", { jobId: job.id, intakeId: job.intakeId });
  } catch (error) {
    await jobStore.fail(job, error);
    console.error("Extraction job failed", {
      jobId: job.id,
      intakeId: job.intakeId,
      attempt: job.attempts,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

await pool.end();
console.info("Extraction worker stopped", { workerId });

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
