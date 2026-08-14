import { z } from "zod";

const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(["true", "false"]).default("false"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(100).default(1000),
  WORKER_JOB_TIMEOUT_SECONDS: z.coerce.number().int().min(30).default(600),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(3),
});

export type AppConfig = {
  nodeEnv: "development" | "test" | "production";
  host: string;
  port: number;
  databaseUrl: string;
  databaseSsl: boolean;
  corsOrigins: string[];
  openAiApiKey: string | undefined;
  openAiModel: string;
  workerPollIntervalMs: number;
  workerJobTimeoutSeconds: number;
  workerMaxAttempts: number;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvironmentSchema.parse(environment);

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    databaseSsl: parsed.DATABASE_SSL === "true",
    corsOrigins: parsed.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    openAiApiKey: parsed.OPENAI_API_KEY,
    openAiModel: parsed.OPENAI_MODEL,
    workerPollIntervalMs: parsed.WORKER_POLL_INTERVAL_MS,
    workerJobTimeoutSeconds: parsed.WORKER_JOB_TIMEOUT_SECONDS,
    workerMaxAttempts: parsed.WORKER_MAX_ATTEMPTS,
  };
}
