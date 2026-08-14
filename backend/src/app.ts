import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppConfig } from "./config.js";
import type { DatabasePool } from "./db.js";
import { CreateIntakeSchema, IntakeIdSchema } from "./domain.js";
import type { IntakeStore } from "./intake-store.js";

type AppDependencies = {
  config: AppConfig;
  pool: DatabasePool;
  intakeStore: IntakeStore;
};

export async function createApp(dependencies: AppDependencies): Promise<FastifyInstance> {
  const { config, pool, intakeStore } = dependencies;
  const app = Fastify({
    logger: config.nodeEnv !== "test",
    bodyLimit: 1_000_000,
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "POST", "OPTIONS"],
  });

  app.get("/health", () => ({ status: "ok" }));

  app.get("/ready", async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return reply.status(503).send({ status: "not_ready" });
    }
  });

  app.post("/api/intakes", async (request, reply) => {
    const parsed = CreateIntakeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        details: parsed.error.flatten(),
      });
    }

    const result = await intakeStore.createIntake(parsed.data);
    reply.header("Location", `/api/intakes/${result.intake.id}`);
    return reply.status(result.created ? 202 : 200).send({
      ...result.intake,
      created: result.created,
    });
  });

  app.get<{ Params: { id: string } }>("/api/intakes/:id", async (request, reply) => {
    const parsedId = IntakeIdSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      return reply.status(400).send({ error: "invalid_intake_id" });
    }

    const intake = await intakeStore.getIntake(parsedId.data);
    if (intake === null) {
      return reply.status(404).send({ error: "intake_not_found" });
    }
    return intake;
  });

  app.get<{ Params: { id: string } }>(
    "/api/intakes/:id/status",
    async (request, reply) => {
      const parsedId = IntakeIdSchema.safeParse(request.params.id);
      if (!parsedId.success) {
        return reply.status(400).send({ error: "invalid_intake_id" });
      }

      const intake = await intakeStore.getIntake(parsedId.data);
      if (intake === null) {
        return reply.status(404).send({ error: "intake_not_found" });
      }
      return {
        id: intake.id,
        status: intake.status,
        normalizedAt: intake.normalizedAt,
        failureReason: intake.failureReason,
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/intakes/:id/transcript",
    async (request, reply) => {
      const parsedId = IntakeIdSchema.safeParse(request.params.id);
      if (!parsedId.success) {
        return reply.status(400).send({ error: "invalid_intake_id" });
      }

      const transcript = await intakeStore.getTranscript(parsedId.data);
      if (transcript === null) {
        return reply.status(404).send({ error: "intake_not_found" });
      }
      return transcript;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/intakes/:id/results",
    async (request, reply) => {
      const parsedId = IntakeIdSchema.safeParse(request.params.id);
      if (!parsedId.success) {
        return reply.status(400).send({ error: "invalid_intake_id" });
      }

      const result = await intakeStore.getResult(parsedId.data);
      if (result === null) {
        return reply.status(404).send({ error: "intake_not_found" });
      }
      return result;
    },
  );

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, "Request failed");
    void reply.status(500).send({ error: "internal_server_error" });
  });

  return app;
}
